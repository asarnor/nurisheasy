import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { geocodeAddress } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  getMockVendorSettings,
  updateMockVendorSettings,
} from '@/lib/mock-data';
import { mergeVendorSettings, type VendorSettings } from '@/lib/vendor-settings';

const vendorSettingsSchema = z.object({
  name: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    })
    .optional(),
  settings: z
    .object({
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      offersPickup: z.boolean().optional(),
      offersDelivery: z.boolean().optional(),
      deliveryRadiusKm: z.number().min(1).optional(),
      preparationDays: z.array(z.number().min(0).max(6)).optional(),
      mealPeriods: z.array(z.enum(['breakfast', 'lunch', 'dinner'])).optional(),
      orderCutoffTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      advanceOrderMinHours: z.number().min(0).optional(),
      defaultPrepTimeMinutes: z.number().min(1).optional(),
      autoAcceptOrders: z.boolean().optional(),
      kdsSoundEnabled: z.boolean().optional(),
      certifications: z.array(z.string()).optional(),
      certificationsReviewStatus: z
        .enum(['pending', 'approved', 'rejected'])
        .optional(),
      allergenPolicyNotes: z.string().optional(),
      ingredientSourcingNotes: z.string().optional(),
      facilityAllergensHandled: z
        .array(
          z.enum([
            'PEANUT',
            'TREE_NUT',
            'SHELLFISH',
            'FISH',
            'EGG',
            'DAIRY',
            'SOY',
            'WHEAT',
            'GLUTEN',
            'SESAME',
          ])
        )
        .optional(),
      offeredContractDurations: z
        .array(z.union([z.literal(3), z.literal(6), z.literal(9), z.literal(12)]))
        .optional(),
      minimumOrderCents: z.number().min(0).optional(),
      deliveryFeeCents: z.number().min(0).optional(),
      acceptingNewContracts: z.boolean().optional(),
      notifyNewOrder: z.boolean().optional(),
      notifyLateAcceptance: z.boolean().optional(),
      notifyNewReview: z.boolean().optional(),
      notifyContractEnding: z.boolean().optional(),
      notificationQuietHoursStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      notificationQuietHoursEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .optional(),
});

const buildResponse = (payload: {
  id: string;
  name: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  stripeAccountId?: string;
  settings: VendorSettings;
}) =>
  NextResponse.json({
    organization: {
      id: payload.id,
      name: payload.name,
      address: payload.address,
      stripeAccountId: payload.stripeAccountId,
      stripeConnected: Boolean(payload.stripeAccountId),
    },
    settings: payload.settings,
  });

/**
 * GET /api/vendor/settings
 * Get vendor profile and operational settings.
 */
export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const vendorId = request.nextUrl.searchParams.get('debugVendorId') || undefined;
      const data = getMockVendorSettings(vendorId);
      if (!data) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      return buildResponse(data);
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json({ error: 'Vendor organization required' }, { status: 403 });
    }

    return buildResponse({
      id: organization._id.toString(),
      name: organization.name,
      address: organization.address,
      stripeAccountId: organization.stripeAccountId,
      settings: mergeVendorSettings(
        organization.vendorSettings as Partial<VendorSettings> | undefined
      ),
    });
  } catch (error) {
    console.error('Error fetching vendor settings:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor settings' }, { status: 500 });
  }
}

/**
 * PATCH /api/vendor/settings
 * Update vendor profile and operational settings.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = vendorSettingsSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const vendorId = request.nextUrl.searchParams.get('debugVendorId') || undefined;
      const data = updateMockVendorSettings(vendorId, {
        name: validated.name,
        address: validated.address,
        settings: validated.settings as Partial<VendorSettings> | undefined,
      });

      if (!data) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      return buildResponse(data);
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json({ error: 'Vendor organization required' }, { status: 403 });
    }

    if (validated.name) {
      organization.name = validated.name;
    }

    if (validated.address) {
      organization.address = {
        ...validated.address,
        coordinates: undefined,
      };

      const fullAddress = `${validated.address.street}, ${validated.address.city}, ${validated.address.state} ${validated.address.zipCode}`;
      const coordinates = await geocodeAddress(fullAddress);
      if (coordinates) {
        organization.address.coordinates = coordinates;
      }
    }

    if (validated.settings) {
      organization.vendorSettings = {
        ...mergeVendorSettings(
          organization.vendorSettings as Partial<VendorSettings> | undefined
        ),
        ...validated.settings,
      };
    }

    await organization.save();

    return buildResponse({
      id: organization._id.toString(),
      name: organization.name,
      address: organization.address,
      stripeAccountId: organization.stripeAccountId,
      settings: mergeVendorSettings(
        organization.vendorSettings as Partial<VendorSettings> | undefined
      ),
    });
  } catch (error) {
    console.error('Error updating vendor settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update vendor settings' }, { status: 500 });
  }
}

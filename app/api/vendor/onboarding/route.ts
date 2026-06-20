import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Organization, { type IOrganization } from '@/lib/models/organization.model';
import MenuItem from '@/lib/models/menu.model';
import { geocodeAddress } from '@/lib/utils/geospatial';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import {
  bootstrapMockVendorOnboarding,
  completeMockVendorOnboarding,
  getMockVendorOnboarding,
  updateMockVendorOnboarding,
} from '@/lib/mock-data';
import { mergeVendorSettings, type VendorSettings } from '@/lib/vendor-settings';
import { evaluateVendorOnboarding } from '@/lib/vendor-onboarding';
import { DEFAULT_VENDOR_SETTINGS } from '@/lib/vendor-settings';

const ONBOARDING_MOCK_VENDOR_ID = 'vendor_new_kitchen';

const kitchenStepSchema = z.object({
  step: z.literal('kitchen'),
  name: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().optional(),
  contactPhone: z.string().min(7),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
  }),
  offersPickup: z.boolean(),
  offersDelivery: z.boolean(),
  deliveryRadiusKm: z.number().min(1),
  preparationDays: z.array(z.number().min(0).max(6)).min(1),
  mealPeriods: z.array(z.enum(['breakfast', 'lunch', 'dinner'])).min(1),
});

const menuStepSchema = z.object({
  step: z.literal('menu'),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        mealCategories: z.array(z.enum(['breakfast', 'lunch', 'dinner'])).min(1),
        allergenTags: z.array(z.string()),
        description: z.string().optional(),
      })
    )
    .min(1)
    .max(10),
});

const updateSchema = z.discriminatedUnion('step', [kitchenStepSchema, menuStepSchema]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'kitchen';

async function getVendorMenuCount(organizationId: string) {
  return MenuItem.countDocuments({ vendorId: organizationId, isAvailable: true });
}

async function buildOnboardingPayload(organization: IOrganization) {
  const menuItemCount = await getVendorMenuCount(organization._id.toString());
  const vendorSettings = organization.vendorSettings as Partial<VendorSettings> | undefined;
  const status = evaluateVendorOnboarding({
    name: organization.name,
    address: organization.address,
    vendorSettings,
    marketplaceVisible: organization.marketplaceVisible,
    onboardingCompletedAt: organization.onboardingCompletedAt,
    menuItemCount,
    stripeConnected: Boolean(organization.stripeAccountId),
  });

  return {
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      address: organization.address,
      stripeAccountId: organization.stripeAccountId,
      marketplaceVisible: organization.marketplaceVisible ?? false,
      settings: mergeVendorSettings(vendorSettings),
    },
    status,
    menuItemCount,
  };
}

async function ensureVendorOrganization(kitchenName?: string) {
  const { userId, orgId } = await auth();
  if (!userId) return { error: 'Unauthorized', status: 401 as const };

  await connectDB();

  if (orgId) {
    let organization = await Organization.findOne({ clerkOrgId: orgId });
    if (organization) {
      if (organization.type !== 'vendor') {
        organization.type = 'vendor';
        organization.marketplaceVisible = organization.marketplaceVisible ?? false;
        organization.vendorSettings = organization.vendorSettings || DEFAULT_VENDOR_SETTINGS;
        await organization.save();
      }
      return { organization };
    }
  }

  const user = await currentUser();
  const name =
    kitchenName?.trim() ||
    user?.fullName ||
    user?.firstName ||
    'My Kitchen';

  let clerkOrgId = orgId;

  if (!clerkOrgId) {
    try {
      const client = await clerkClient();
      const created = await client.organizations.createOrganization({
        name,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        createdBy: userId,
        publicMetadata: { safeplateType: 'vendor' },
      });
      clerkOrgId = created.id;
    } catch (error) {
      console.error('Failed to create Clerk organization:', error);
      return {
        error: 'Could not create vendor organization. Please try again.',
        status: 500 as const,
      };
    }
  }

  let organization = await Organization.findOne({ clerkOrgId });
  if (!organization) {
    organization = await Organization.create({
      clerkOrgId,
      name,
      type: 'vendor',
      marketplaceVisible: false,
      vendorSettings: DEFAULT_VENDOR_SETTINGS,
      safetyProfile: {
        criticalAllergens: [],
        preferences: [],
        taxExempt: false,
      },
    });
  }

  return { organization, clerkOrgId };
}

export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const data =
        getMockVendorOnboarding(ONBOARDING_MOCK_VENDOR_ID) || bootstrapMockVendorOnboarding();
      if (!data) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    const ensured = await ensureVendorOrganization();
    if ('error' in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status });
    }

    const payload = await buildOnboardingPayload(ensured.organization);
    return NextResponse.json({
      ...payload,
      clerkOrgId: ensured.clerkOrgId,
    });
  } catch (error) {
    console.error('Error fetching vendor onboarding:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      if (action === 'bootstrap') {
        const data = bootstrapMockVendorOnboarding();
        return NextResponse.json(data);
      }

      if (action === 'complete') {
        const result = completeMockVendorOnboarding(ONBOARDING_MOCK_VENDOR_ID);
        if (!result) {
          return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }
        if ('error' in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json(result);
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'bootstrap') {
      const body = await request.json().catch(() => ({}));
      const ensured = await ensureVendorOrganization(body?.kitchenName);
      if ('error' in ensured) {
        return NextResponse.json({ error: ensured.error }, { status: ensured.status });
      }

      const payload = await buildOnboardingPayload(ensured.organization);
      return NextResponse.json({
        ...payload,
        clerkOrgId: ensured.clerkOrgId,
      });
    }

    if (action === 'complete') {
      const ensured = await ensureVendorOrganization();
      if ('error' in ensured) {
        return NextResponse.json({ error: ensured.error }, { status: ensured.status });
      }

      const organization = ensured.organization;
      const menuItemCount = await getVendorMenuCount(organization._id.toString());
      const status = evaluateVendorOnboarding({
        name: organization.name,
        address: organization.address,
        vendorSettings: organization.vendorSettings as Partial<VendorSettings> | undefined,
        marketplaceVisible: organization.marketplaceVisible,
        onboardingCompletedAt: organization.onboardingCompletedAt,
        menuItemCount,
        stripeConnected: Boolean(organization.stripeAccountId),
      });

      const kitchenDone = status.checklist.find((item) => item.id === 'kitchen')?.complete;
      const menuDone = status.checklist.find((item) => item.id === 'menu')?.complete;
      if (!kitchenDone || !menuDone) {
        return NextResponse.json(
          { error: 'Complete your kitchen profile and menu before going live.' },
          { status: 400 }
        );
      }

      organization.marketplaceVisible = true;
      organization.onboardingCompletedAt = new Date();
      await organization.save();

      const payload = await buildOnboardingPayload(organization);
      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in vendor onboarding POST:', error);
    return NextResponse.json({ error: 'Failed to process onboarding action' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      if (validated.step === 'kitchen') {
        const data = updateMockVendorOnboarding(ONBOARDING_MOCK_VENDOR_ID, {
          name: validated.name,
          address: validated.address,
          settings: {
            contactName: validated.contactName,
            contactEmail: validated.contactEmail || '',
            contactPhone: validated.contactPhone,
            offersPickup: validated.offersPickup,
            offersDelivery: validated.offersDelivery,
            deliveryRadiusKm: validated.deliveryRadiusKm,
            preparationDays: validated.preparationDays,
            mealPeriods: validated.mealPeriods,
          },
        });
        return NextResponse.json(data);
      }

      const data = updateMockVendorOnboarding(ONBOARDING_MOCK_VENDOR_ID, {
        menuItems: validated.items,
      });
      return NextResponse.json(data);
    }

    const ensured = await ensureVendorOrganization();
    if ('error' in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status });
    }

    const organization = ensured.organization;

    if (validated.step === 'kitchen') {
      organization.name = validated.name;
      organization.address = { ...validated.address };
      const fullAddress = `${validated.address.street}, ${validated.address.city}, ${validated.address.state} ${validated.address.zipCode}`;
      const coordinates = await geocodeAddress(fullAddress);
      if (coordinates) {
        organization.address.coordinates = coordinates;
      }

      organization.vendorSettings = {
        ...mergeVendorSettings(organization.vendorSettings as Partial<VendorSettings> | undefined),
        contactName: validated.contactName,
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone,
        offersPickup: validated.offersPickup,
        offersDelivery: validated.offersDelivery,
        deliveryRadiusKm: validated.deliveryRadiusKm,
        preparationDays: validated.preparationDays,
        mealPeriods: validated.mealPeriods,
      };
      await organization.save();
    }

    if (validated.step === 'menu') {
      for (const item of validated.items) {
        await MenuItem.create({
          vendorId: organization._id,
          name: item.name,
          description: item.description || '',
          price: Math.round(item.price * 100),
          isAvailable: true,
          allergenTags: item.allergenTags,
          ingredients: [],
          mealCategories: item.mealCategories,
        });
      }
    }

    const payload = await buildOnboardingPayload(organization);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error updating vendor onboarding:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 });
  }
}

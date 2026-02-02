import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import { getCurrentOrganization, requireRole } from '@/lib/utils/clerk';
import { geocodeAddress } from '@/lib/utils/geospatial';

const updateOrganizationSchema = z.object({
  name: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
  safetyProfile: z.object({
    criticalAllergens: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
    taxExempt: z.boolean().optional(),
  }).optional(),
});

/**
 * GET /api/organizations
 * Get current organization
 */
export async function GET() {
  try {
    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        safetyProfile: organization.safetyProfile,
        address: organization.address,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations
 * Update current organization
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateOrganizationSchema.parse(body);

    // Update fields
    if (validatedData.name) {
      organization.name = validatedData.name;
    }

    if (validatedData.address) {
      organization.address = {
        ...validatedData.address,
        coordinates: undefined, // Will be geocoded below
      };

      // Geocode address
      const fullAddress = `${validatedData.address.street}, ${validatedData.address.city}, ${validatedData.address.state} ${validatedData.address.zipCode}`;
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates) {
        organization.address.coordinates = coordinates;
      }
    }

    if (validatedData.safetyProfile) {
      if (validatedData.safetyProfile.criticalAllergens !== undefined) {
        organization.safetyProfile.criticalAllergens = validatedData.safetyProfile.criticalAllergens;
      }
      if (validatedData.safetyProfile.preferences !== undefined) {
        organization.safetyProfile.preferences = validatedData.safetyProfile.preferences;
      }
      if (validatedData.safetyProfile.taxExempt !== undefined) {
        organization.safetyProfile.taxExempt = validatedData.safetyProfile.taxExempt;
      }
    }

    await organization.save();

    return NextResponse.json({
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        safetyProfile: organization.safetyProfile,
        address: organization.address,
      },
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

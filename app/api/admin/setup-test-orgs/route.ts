import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';

/**
 * POST /api/admin/setup-test-orgs
 * Development-only endpoint to set up test organizations
 * This should be disabled in production
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clerkOrgId, type } = body;

    if (!clerkOrgId || !type) {
      return NextResponse.json(
        { error: 'Missing clerkOrgId or type' },
        { status: 400 }
      );
    }

    if (!['consumer', 'vendor'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "consumer" or "vendor"' },
        { status: 400 }
      );
    }

    // Update or create organization
    const organization = await Organization.findOneAndUpdate(
      { clerkOrgId },
      {
        clerkOrgId,
        type,
        name: body.name || (type === 'consumer' ? 'Test Consumer Org' : 'Test Vendor Org'),
        safetyProfile: {
          criticalAllergens: type === 'consumer' ? ['PEANUT'] : [],
          preferences: [],
          taxExempt: type === 'consumer',
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        clerkOrgId: organization.clerkOrgId,
      },
    });
  } catch (error) {
    console.error('Error setting up test organization:', error);
    return NextResponse.json(
      { error: 'Failed to setup organization', details: (error as Error).message },
      { status: 500 }
    );
  }
}

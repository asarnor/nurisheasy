import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { updateMockDeliveryLocation } from '@/lib/mock-data';
import {
  getDeliveryById,
  serializeDeliveryTracking,
  updateDeliveryLocation,
} from '@/lib/delivery-service';
import { getCurrentOrganization } from '@/lib/utils/clerk';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().positive().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { deliveryId: string } }
) {
  try {
    const body = await request.json();
    const location = locationSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const tracking = updateMockDeliveryLocation(params.deliveryId, location);
      if (!tracking) {
        return NextResponse.json({ error: 'Delivery not found or inactive' }, { status: 404 });
      }

      return NextResponse.json({ delivery: tracking });
    }

    const organization = await getCurrentOrganization();
    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json({ error: 'Vendor organization required' }, { status: 403 });
    }

    const existing = await getDeliveryById(params.deliveryId);
    if (!existing) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    if (existing.vendorId.toString() !== organization._id.toString()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await updateDeliveryLocation(params.deliveryId, location);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const tracking = await serializeDeliveryTracking(result.delivery);
    return NextResponse.json({ delivery: tracking });
  } catch (error) {
    console.error('Error updating delivery location:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update delivery location' }, { status: 500 });
  }
}

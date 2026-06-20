import { NextRequest, NextResponse } from 'next/server';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { completeMockDelivery } from '@/lib/mock-data';
import {
  completeDelivery,
  getDeliveryById,
  serializeDeliveryTracking,
} from '@/lib/delivery-service';
import { getCurrentOrganization } from '@/lib/utils/clerk';

export async function POST(
  request: NextRequest,
  { params }: { params: { deliveryId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const tracking = completeMockDelivery(params.deliveryId);
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

    const result = await completeDelivery(params.deliveryId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const tracking = await serializeDeliveryTracking(result.delivery);
    return NextResponse.json({ delivery: tracking });
  } catch (error) {
    console.error('Error completing delivery:', error);
    return NextResponse.json({ error: 'Failed to complete delivery' }, { status: 500 });
  }
}

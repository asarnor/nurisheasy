import { NextRequest, NextResponse } from 'next/server';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getMockDeliveryTracking } from '@/lib/mock-data';
import {
  getDeliveryById,
  serializeDeliveryTracking,
} from '@/lib/delivery-service';
import { getCurrentOrganization } from '@/lib/utils/clerk';

async function canAccessDelivery(
  request: NextRequest,
  delivery: {
    orderId: string;
    vendorId: string;
    consumerId: string;
  }
) {
  if (await shouldUseMockData(request)) {
    const role = await getDebugRoleFromRequest(request);
    return role === 'vendor' || role === 'consumer' || role === 'admin';
  }

  const organization = await getCurrentOrganization();
  if (!organization) return false;

  const orgId = organization._id.toString();
  return (
    orgId === delivery.vendorId ||
    orgId === delivery.consumerId
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { deliveryId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const tracking = getMockDeliveryTracking(params.deliveryId);
      if (!tracking) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      const allowed = await canAccessDelivery(request, tracking);
      if (!allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ delivery: tracking });
    }

    const delivery = await getDeliveryById(params.deliveryId);
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const allowed = await canAccessDelivery(request, {
      orderId: delivery.orderId.toString(),
      vendorId: delivery.vendorId.toString(),
      consumerId: delivery.consumerId.toString(),
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tracking = await serializeDeliveryTracking(delivery);
    return NextResponse.json({ delivery: tracking });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery tracking' }, { status: 500 });
  }
}

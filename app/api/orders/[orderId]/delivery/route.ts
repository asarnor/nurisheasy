import { NextRequest, NextResponse } from 'next/server';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getMockDeliveryByOrder, getMockDeliveryTracking } from '@/lib/mock-data';
import {
  getActiveDeliveryForOrder,
  serializeDeliveryTracking,
} from '@/lib/delivery-service';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (!role) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const delivery = getMockDeliveryByOrder(params.orderId);
      if (!delivery) {
        return NextResponse.json({ delivery: null });
      }

      const tracking = getMockDeliveryTracking(delivery.id);
      return NextResponse.json({ delivery: tracking });
    }

    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Organization required' }, { status: 403 });
    }

    await connectDB();
    const order = await Order.findById(params.orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orgId = organization._id.toString();
    const isConsumer = order.consumerId.toString() === orgId;
    const isVendor = order.subOrders.some((entry) => entry.vendorId.toString() === orgId);
    if (!isConsumer && !isVendor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const delivery = await getActiveDeliveryForOrder(params.orderId);
    if (!delivery) {
      return NextResponse.json({ delivery: null });
    }

    const tracking = await serializeDeliveryTracking(delivery);
    return NextResponse.json({ delivery: tracking });
  } catch (error) {
    console.error('Error fetching order delivery:', error);
    return NextResponse.json({ error: 'Failed to fetch order delivery' }, { status: 500 });
  }
}

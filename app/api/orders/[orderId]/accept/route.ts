import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { acceptMockSubOrder, getMockVendorId } from '@/lib/mock-data';
import {
  allActiveSubOrdersAccepted,
  captureAndTransferForOrder,
  recomputeOrderStatus,
} from '@/lib/order-lifecycle';

/**
 * POST /api/orders/[orderId]/accept
 * Vendor accepts a sub-order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json(
          { error: 'Vendor organization required' },
          { status: 403 }
        );
      }

      const vendorId = getMockVendorId();
      const order = acceptMockSubOrder(params.orderId, vendorId);

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        order,
        message: 'Sub-order accepted successfully',
      });
    }

    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json(
        { error: 'Vendor organization required' },
        { status: 403 }
      );
    }

    const order = await Order.findById(params.orderId);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Find the sub-order for this vendor
    const subOrderIndex = order.subOrders.findIndex(
      (so) => so.vendorId.toString() === organization._id.toString()
    );

    if (subOrderIndex === -1) {
      return NextResponse.json(
        { error: 'Sub-order not found for this vendor' },
        { status: 404 }
      );
    }

    const subOrder = order.subOrders[subOrderIndex];

    if (subOrder.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Sub-order already ${subOrder.status}` },
        { status: 400 }
      );
    }

    order.subOrders[subOrderIndex].status = 'ACCEPTED';
    order.subOrders[subOrderIndex].acceptedAt = new Date();

    if (allActiveSubOrdersAccepted(order.subOrders)) {
      try {
        await captureAndTransferForOrder(order);
      } catch (error) {
        console.error('Payment capture/transfer failed on accept:', error);
      }
    }

    recomputeOrderStatus(order);
    await order.save();

    return NextResponse.json({
      order: order.toObject(),
      message: 'Sub-order accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: 'Failed to accept order' },
      { status: 500 }
    );
  }
}

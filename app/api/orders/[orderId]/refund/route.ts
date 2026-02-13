import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { refundSubOrder } from '@/lib/utils/stripe';
import { auth } from '@clerk/nextjs/server';
import { shouldUseMockData } from '@/lib/utils/debug';
import { refundMockSubOrder } from '@/lib/mock-data';

const refundSchema = z.object({
  subOrderIndex: z.number().int().min(0),
});

/**
 * POST /api/orders/[orderId]/refund
 * Admin refunds a sub-order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    if (await shouldUseMockData(request)) {
      const body = await request.json();
      const { subOrderIndex } = refundSchema.parse(body);
      const order = refundMockSubOrder(params.orderId, subOrderIndex);

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        order,
        message: 'Sub-order refunded successfully',
      });
    }

    await connectDB();
    
    // Check admin role
    const { orgRole } = await auth();
    if (orgRole !== 'org:admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subOrderIndex } = refundSchema.parse(body);

    const order = await Order.findById(params.orderId);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (subOrderIndex >= order.subOrders.length) {
      return NextResponse.json(
        { error: 'Invalid sub-order index' },
        { status: 400 }
      );
    }

    const subOrder = order.subOrders[subOrderIndex];

    if (subOrder.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Sub-order already refunded' },
        { status: 400 }
      );
    }

    // Process refund via Stripe
    await refundSubOrder(
      order.paymentIntentId,
      subOrder.vendorTotal,
      {
        orderId: order._id.toString(),
        subOrderIndex: subOrderIndex.toString(),
        reason: 'admin_dispute',
      }
    );

    // Update sub-order status
    order.subOrders[subOrderIndex].status = 'REFUNDED';
    
    // If all sub-orders are refunded, update order status
    if (order.subOrders.every((so) => so.status === 'REFUNDED')) {
      order.status = 'REFUNDED';
    }

    await order.save();

    return NextResponse.json({
      order: order.toObject(),
      message: 'Sub-order refunded successfully',
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

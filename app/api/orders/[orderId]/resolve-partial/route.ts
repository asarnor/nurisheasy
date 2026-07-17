import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { resolveMockPartialOrder } from '@/lib/mock-data';
import {
  cancelPaymentIntentSafe,
  captureAndTransferForOrder,
  recomputeOrderStatus,
} from '@/lib/order-lifecycle';

const resolveSchema = z.object({
  action: z.enum(['proceed', 'cancel_all']),
});

/**
 * POST /api/orders/[orderId]/resolve-partial
 *
 * Called by the consumer after one or more vendors decline / auto-expire on a
 * multi-vendor order. Two supported actions:
 *
 *   - `cancel_all` → cancel any remaining pending/accepted sub-orders and
 *     release the PaymentIntent (no capture, no refund).
 *   - `proceed`    → capture the full uncaptured PaymentIntent and refund the
 *     total of each cancelled sub-order after capture. This preserves the
 *     existing manual-capture Connect flow rather than adjusting capture
 *     amounts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = resolveSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'consumer' && role !== 'admin') {
        return NextResponse.json(
          { error: 'Consumer organization required' },
          { status: 403 }
        );
      }

      const result = resolveMockPartialOrder(params.orderId, action);
      if (!result) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        order: result,
        message:
          action === 'cancel_all'
            ? 'Order cancelled'
            : 'Order proceeding with accepted sub-orders',
      });
    }

    await connectDB();
    const organization = await getCurrentOrganization();

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 403 }
      );
    }

    const order = await Order.findById(params.orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (
      organization.type === 'consumer' &&
      order.consumerId.toString() !== organization._id.toString()
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (organization.type === 'vendor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'cancel_all') {
      order.subOrders.forEach((so, idx) => {
        if (so.status === 'PENDING' || so.status === 'ACCEPTED') {
          order.subOrders[idx].status = 'CANCELLED';
        }
      });
      await cancelPaymentIntentSafe(order.paymentIntentId);
      recomputeOrderStatus(order);
      await order.save();
      return NextResponse.json({
        order: order.toObject(),
        message: 'Order cancelled',
      });
    }

    const stillPending = order.subOrders.some((so) => so.status === 'PENDING');
    if (stillPending) {
      return NextResponse.json(
        {
          error:
            'Cannot proceed while some sub-orders remain pending vendor acceptance',
        },
        { status: 400 }
      );
    }

    const cancelledTotals = order.subOrders
      .map((so, idx) => ({
        subOrderIndex: idx,
        total: so.vendorTotal,
        status: so.status,
      }))
      .filter((entry) => entry.status === 'CANCELLED')
      .map(({ subOrderIndex, total }) => ({ subOrderIndex, total }));

    const hasAccepted = order.subOrders.some((so) => so.status === 'ACCEPTED');
    if (!hasAccepted) {
      await cancelPaymentIntentSafe(order.paymentIntentId);
      recomputeOrderStatus(order);
      await order.save();
      return NextResponse.json({
        order: order.toObject(),
        message: 'No accepted sub-orders — order cancelled',
      });
    }

    try {
      await captureAndTransferForOrder(order, cancelledTotals);
    } catch (error) {
      console.error('resolve-partial capture failed:', error);
      return NextResponse.json(
        {
          error: 'Payment capture failed',
          details: (error as Error).message,
        },
        { status: 500 }
      );
    }

    recomputeOrderStatus(order);
    await order.save();

    return NextResponse.json({
      order: order.toObject(),
      message: 'Proceeded with accepted sub-orders; cancelled portions refunded',
    });
  } catch (error) {
    console.error('Error resolving partial order:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resolve partial order' },
      { status: 500 }
    );
  }
}

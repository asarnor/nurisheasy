import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { declineMockSubOrder, getMockVendorId } from '@/lib/mock-data';
import {
  cancelPaymentIntentSafe,
  recomputeOrderStatus,
} from '@/lib/order-lifecycle';

const declineSchema = z.object({
  reason: z.enum(['out_of_stock', 'closed', 'capacity', 'other']),
  note: z.string().max(500).optional(),
});

/**
 * POST /api/orders/[orderId]/decline
 *
 * Vendor declines their sub-order before the acceptance cutoff. The sub-order
 * is marked CANCELLED with a decline reason. If the decline leaves every
 * sub-order cancelled, the parent order is cancelled and the PaymentIntent is
 * released (uncaptured). Otherwise the consumer is expected to hit
 * /resolve-partial to pick between proceed vs cancel-all.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reason, note } = declineSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json(
          { error: 'Vendor organization required' },
          { status: 403 }
        );
      }

      const vendorId = getMockVendorId();
      const result = declineMockSubOrder(params.orderId, vendorId, reason, note);

      if (!result) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const requiresConsumerChoice = result.subOrders.some(
        (so) => so.status !== 'CANCELLED'
      );

      return NextResponse.json({
        order: result,
        message: 'Sub-order declined',
        requiresConsumerChoice,
        nextAction: requiresConsumerChoice
          ? { endpoint: `/api/orders/${result._id}/resolve-partial`, actions: ['proceed', 'cancel_all'] }
          : null,
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

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
        { error: `Cannot decline sub-order in status ${subOrder.status}` },
        { status: 400 }
      );
    }

    order.subOrders[subOrderIndex].status = 'CANCELLED';
    order.subOrders[subOrderIndex].declineReason = reason;
    order.subOrders[subOrderIndex].declineNote = note;
    order.subOrders[subOrderIndex].declinedAt = new Date();

    const allCancelled = order.subOrders.every((so) => so.status === 'CANCELLED');
    if (allCancelled) {
      // No captured funds to refund — PaymentIntent is still uncaptured; cancel it.
      await cancelPaymentIntentSafe(order.paymentIntentId);
    }

    recomputeOrderStatus(order);
    await order.save();

    const requiresConsumerChoice = !allCancelled;

    return NextResponse.json({
      order: order.toObject(),
      message: 'Sub-order declined',
      requiresConsumerChoice,
      nextAction: requiresConsumerChoice
        ? {
            endpoint: `/api/orders/${order._id}/resolve-partial`,
            actions: ['proceed', 'cancel_all'],
          }
        : null,
    });
  } catch (error) {
    console.error('Error declining order:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to decline order' }, { status: 500 });
  }
}

import type { IOrder, ISubOrder } from '@/lib/models/order.model';
import Organization from '@/lib/models/organization.model';
import {
  capturePaymentIntent,
  transferToVendor,
  refundSubOrder,
} from '@/lib/utils/stripe';
import { stripe } from '@/lib/utils/stripe';

/**
 * True when the order originates from a contract flow (has a contractId
 * reference). Contract-like orders auto-accept for the vendor by default
 * (issue #6). Also accepts a legacy `contractDurationMonths` hint used by the
 * order-creation flow before the Order has been saved.
 */
export function isContractLikeOrder(order: {
  contractId?: unknown;
  contractDurationMonths?: unknown;
}): boolean {
  return Boolean(order.contractId || order.contractDurationMonths);
}

/**
 * Returns true if a sub-order for the given vendor should be auto-accepted at
 * creation time. Contract-like orders always auto-accept. One-off orders only
 * auto-accept when vendor settings opt in.
 */
export function shouldAutoAcceptSubOrder(
  order: { contractId?: unknown; contractDurationMonths?: unknown },
  vendorAutoAcceptOrders?: boolean | null
): boolean {
  if (isContractLikeOrder(order)) return true;
  return Boolean(vendorAutoAcceptOrders);
}

/**
 * Capture the PaymentIntent and issue transfers to every ACCEPTED vendor.
 * Called when all remaining sub-orders reach ACCEPTED (or when the consumer
 * chooses to proceed with a partial fulfillment).
 *
 * `cancelledTotals` are the totals of CANCELLED sub-orders that should be
 * refunded after capture (pragmatic approach for partial fulfillment).
 */
export async function captureAndTransferForOrder(
  order: IOrder,
  cancelledTotals: Array<{ subOrderIndex: number; total: number }> = []
): Promise<void> {
  await capturePaymentIntent(order.paymentIntentId);

  for (let i = 0; i < order.subOrders.length; i++) {
    const so = order.subOrders[i];
    if (so.status !== 'ACCEPTED') continue;

    const vendor = await Organization.findById(so.vendorId);
    if (vendor?.stripeAccountId) {
      try {
        await transferToVendor(
          so.vendorTotal,
          vendor.stripeAccountId,
          order.paymentIntentId,
          {
            orderId: order._id.toString(),
            subOrderId: i.toString(),
          }
        );
      } catch (error) {
        console.error(`Transfer to vendor ${so.vendorId} failed:`, error);
      }
    }
  }

  // Refund cancelled portions if any (partial fulfillment via proceed).
  for (const { subOrderIndex, total } of cancelledTotals) {
    if (total <= 0) continue;
    try {
      await refundSubOrder(order.paymentIntentId, total, {
        orderId: order._id.toString(),
        subOrderIndex: subOrderIndex.toString(),
        reason: 'partial_fulfillment_cancel',
      });
    } catch (error) {
      console.error(
        `Refund for cancelled sub-order ${subOrderIndex} failed:`,
        error
      );
    }
  }
}

/**
 * Cancel a Stripe PaymentIntent that was in manual-capture mode (funds not yet
 * captured). Safely swallows errors — the order status still reflects
 * cancellation even if Stripe cannot be reached (e.g. mock/dev).
 */
export async function cancelPaymentIntentSafe(
  paymentIntentId: string
): Promise<void> {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    console.error(`Failed to cancel PaymentIntent ${paymentIntentId}:`, error);
  }
}

/**
 * Recompute the parent order status from its sub-order statuses.
 * Mirrors the mock-data helper so real + mock stay in sync.
 */
export function recomputeOrderStatus(order: IOrder | { subOrders: ISubOrder[]; status: IOrder['status'] }): void {
  const subs = order.subOrders;

  if (subs.every((so) => so.status === 'DELIVERED')) {
    order.status = 'FULFILLED';
    return;
  }

  if (subs.every((so) => so.status === 'CANCELLED')) {
    order.status = 'CANCELLED';
    return;
  }

  if (subs.every((so) => so.status === 'REFUNDED')) {
    order.status = 'REFUNDED';
    return;
  }

  if (subs.every((so) => so.status !== 'PENDING')) {
    order.status = 'CONFIRMED';
    return;
  }

  order.status = 'PROCESSING';
}

/**
 * Every non-cancelled sub-order has been accepted → payment can be captured.
 */
export function allActiveSubOrdersAccepted(subs: Pick<ISubOrder, 'status'>[]): boolean {
  const active = subs.filter((so) => so.status !== 'CANCELLED');
  return active.length > 0 && active.every((so) => so.status === 'ACCEPTED');
}

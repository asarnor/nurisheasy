import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import Organization from '@/lib/models/organization.model';
import { sendSMS, makeVoiceCall } from '@/lib/utils/twilio';
import { getActivePlatformRules } from '@/lib/platform-rules';
import {
  cancelPaymentIntentSafe,
  isContractLikeOrder,
  recomputeOrderStatus,
} from '@/lib/order-lifecycle';

/**
 * Escalation ladder for a PENDING sub-order (issue #6):
 *
 *   t = 0        push/email (conceptual — logged on order create)
 *   t >= 10 min  SMS wake-up
 *   t >= 15 min  voice call
 *   t >= timeout (PlatformRule.vendorAcceptanceTimeoutMinutes, default 30 min)
 *                → AUTO-EXPIRE: mark sub-order CANCELLED with reason auto_expired.
 *                  If the whole order is cancelled, release the PaymentIntent.
 *
 * The escalation state is stored on the sub-order (acceptanceEscalation) so
 * repeated cron invocations don't spam vendors.
 *
 * Auto-accepting sub-orders (contract-like orders + vendor.autoAcceptOrders)
 * never reach PENDING for long, so they never escalate in practice — but we
 * still filter defensively.
 */
export interface RunAcceptanceJobResult {
  ordersChecked: number;
  smsSent: number;
  voiceCalls: number;
  expired: number;
}

export async function runVendorAcceptanceJob(): Promise<RunAcceptanceJobResult> {
  await connectDB();

  const rules = await getActivePlatformRules();
  const timeoutMinutes = rules.deliveryTiming?.vendorAcceptanceTimeoutMinutes ?? 30;
  const now = Date.now();

  const orders = await Order.find({
    status: 'PROCESSING',
    'subOrders.status': 'PENDING',
  }).populate('subOrders.vendorId');

  let smsSent = 0;
  let voiceCalls = 0;
  let expired = 0;

  for (const order of orders) {
    // Skip contract-like orders — they auto-accept and shouldn't escalate.
    // (Defensive: any PENDING sub-order on a contract-like order was likely
    // manually set to PENDING because auto-accept was overridden.)
    const contractLike = isContractLikeOrder(order.toObject());

    const ageMs = now - new Date(order.createdAt).getTime();
    const ageMin = ageMs / 60_000;

    let mutated = false;

    for (let i = 0; i < order.subOrders.length; i++) {
      const sub = order.subOrders[i];
      if (sub.status !== 'PENDING') continue;

      const vendorDoc = sub.vendorId as any;
      const vendor = vendorDoc && typeof vendorDoc === 'object' && vendorDoc.name
        ? vendorDoc
        : await Organization.findById(sub.vendorId);
      // Prefer explicit contact phone from vendorSettings (issue #6 phone fix)
      const phone: string | undefined =
        vendor?.vendorSettings?.contactPhone || vendor?.phoneNumber;

      const orderDetails = sub.items
        .map((item: any) => `${item.name} x${item.quantity}`)
        .join(', ');

      const escalation = sub.acceptanceEscalation || {};

      // Auto-expire path (highest priority, may be true even for contract-like)
      if (ageMin >= timeoutMinutes && !escalation.expiredAt) {
        order.subOrders[i].status = 'CANCELLED';
        order.subOrders[i].declineReason = 'auto_expired';
        order.subOrders[i].declinedAt = new Date();
        order.subOrders[i].acceptanceEscalation = {
          ...escalation,
          expiredAt: new Date(),
        };
        expired += 1;
        mutated = true;
        console.log(
          `[vendor-acceptance] auto-expired sub-order for vendor ${sub.vendorId} on order ${order._id} after ${Math.round(ageMin)} min`
        );
        continue;
      }

      // Contract-like orders don't get SMS/voice — they should have been
      // auto-accepted at creation.
      if (contractLike) continue;

      if (ageMin >= 15 && !escalation.voiceSentAt && phone) {
        try {
          await makeVoiceCall(
            phone,
            `Urgent: SafePlate order ${order._id.toString()} is still awaiting your acceptance. ${orderDetails}. Please open the SafePlate dashboard now.`
          );
          voiceCalls += 1;
          order.subOrders[i].acceptanceEscalation = {
            ...escalation,
            voiceSentAt: new Date(),
          };
          mutated = true;
        } catch (error) {
          console.error(`Voice call to ${phone} failed:`, error);
        }
      } else if (ageMin >= 10 && !escalation.smsSentAt && phone) {
        try {
          await sendSMS(
            phone,
            `SafePlate: New order ${order._id.toString()} awaiting acceptance: ${orderDetails}. Please accept or decline in your dashboard.`
          );
          smsSent += 1;
          order.subOrders[i].acceptanceEscalation = {
            ...escalation,
            smsSentAt: new Date(),
          };
          mutated = true;
        } catch (error) {
          console.error(`SMS to ${phone} failed:`, error);
        }
      }
    }

    if (mutated) {
      // If every sub-order was cancelled, release the PaymentIntent.
      const allCancelled = order.subOrders.every((so) => so.status === 'CANCELLED');
      if (allCancelled) {
        await cancelPaymentIntentSafe(order.paymentIntentId);
      }
      recomputeOrderStatus(order);
      await order.save();
    }
  }

  return {
    ordersChecked: orders.length,
    smsSent,
    voiceCalls,
    expired,
  };
}

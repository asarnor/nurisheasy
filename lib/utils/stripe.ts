import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Calculate platform fee (10% of order total)
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * 0.1);
}

/**
 * Create a payment intent for multi-vendor order
 * Uses manual capture for split-payment control
 */
export async function createPaymentIntent(
  amount: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const platformFee = calculatePlatformFee(amount);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    capture_method: 'manual', // Manual capture for split control
    metadata,
  });
  
  return paymentIntent;
}

/**
 * Capture payment intent (after vendor acceptance)
 */
export async function capturePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Create transfer to vendor Stripe Connect account
 */
export async function transferToVendor(
  amount: number,
  destinationAccountId: string,
  transferGroup: string,
  metadata: Record<string, string>
): Promise<Stripe.Transfer> {
  return await stripe.transfers.create({
    amount: amount - calculatePlatformFee(amount), // Vendor gets amount minus platform fee
    currency: 'usd',
    destination: destinationAccountId,
    transfer_group: transferGroup,
    metadata,
  });
}

/**
 * Refund a sub-order
 */
export async function refundSubOrder(
  paymentIntentId: string,
  amount: number,
  metadata: Record<string, string>
): Promise<Stripe.Refund> {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    metadata,
  });
}

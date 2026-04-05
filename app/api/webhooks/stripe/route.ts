import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { stripe } from '@/lib/utils/stripe';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks (idempotent)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    await connectDB();

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Check if order already exists (idempotency)
  const existingOrder = await Order.findOne({
    paymentIntentId: paymentIntent.id,
  });

  if (existingOrder) {
    console.log(`Order ${existingOrder._id} already processed for payment intent ${paymentIntent.id}`);
    return;
  }

  // Order creation should happen before payment, but handle edge case
  console.log(`Payment intent ${paymentIntent.id} succeeded`);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const order = await Order.findOne({
    paymentIntentId: paymentIntent.id,
  });

  if (order) {
    order.status = 'CANCELLED';
    await order.save();
    console.log(`Order ${order._id} cancelled due to payment failure`);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Refund handling is done manually via admin endpoint
  // This webhook can be used for logging/notifications
  console.log(`Charge ${charge.id} refunded`);
}

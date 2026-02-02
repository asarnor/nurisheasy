import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { capturePaymentIntent, transferToVendor } from '@/lib/utils/stripe';
import Organization from '@/lib/models/organization.model';

/**
 * POST /api/orders/[orderId]/accept
 * Vendor accepts a sub-order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
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

    // Update sub-order status
    order.subOrders[subOrderIndex].status = 'ACCEPTED';
    order.subOrders[subOrderIndex].acceptedAt = new Date();
    
    // If all sub-orders are accepted, capture payment and update order status
    const allAccepted = order.subOrders.every((so) => so.status === 'ACCEPTED');
    
    if (allAccepted) {
      // Capture payment intent
      await capturePaymentIntent(order.paymentIntentId);
      
      // Transfer funds to each vendor
      for (const so of order.subOrders) {
        const vendor = await Organization.findById(so.vendorId);
        if (vendor?.stripeAccountId) {
          await transferToVendor(
            so.vendorTotal,
            vendor.stripeAccountId,
            order.paymentIntentId,
            {
              orderId: order._id.toString(),
              subOrderId: subOrderIndex.toString(),
            }
          );
        }
      }
      
      order.status = 'CONFIRMED';
    }

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

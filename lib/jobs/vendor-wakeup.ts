import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import Organization from '@/lib/models/organization.model';
import { notifyVendorWakeUp } from '@/lib/utils/twilio';

/**
 * Check for pending orders and trigger vendor wake-up calls
 * This should be run as a scheduled job (every 15 minutes)
 */
export async function checkPendingOrders() {
  try {
    await connectDB();

    // Find orders with sub-orders that have been PENDING for more than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const orders = await Order.find({
      status: 'PROCESSING',
      'subOrders.status': 'PENDING',
      createdAt: { $lte: fifteenMinutesAgo },
    }).populate('subOrders.vendorId', 'name phoneNumber');

    for (const order of orders) {
      for (const subOrder of order.subOrders) {
        if (subOrder.status === 'PENDING') {
          const vendor = subOrder.vendorId as any;
          
          if (vendor?.phoneNumber) {
            const orderDetails = subOrder.items
              .map((item: any) => `${item.name} x${item.quantity}`)
              .join(', ');

            try {
              await notifyVendorWakeUp(
                vendor.phoneNumber,
                order._id.toString(),
                orderDetails
              );
              
              console.log(`Wake-up call sent to vendor ${vendor._id} for order ${order._id}`);
            } catch (error) {
              console.error(`Failed to send wake-up call to vendor ${vendor._id}:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking pending orders:', error);
    throw error;
  }
}

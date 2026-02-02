import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('Resend API key not configured');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  orderDetails: {
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }
): Promise<void> {
  if (!resend) {
    console.warn('Resend not configured, skipping email:', { to, orderId });
    return;
  }

  try {
    await resend.emails.send({
      from: 'SafePlate <orders@safeplate.com>',
      to,
      subject: `Order Confirmation #${orderId}`,
      html: `
        <h1>Order Confirmation</h1>
        <p>Thank you for your order!</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total:</strong> $${(orderDetails.totalAmount / 100).toFixed(2)}</p>
        <h2>Items:</h2>
        <ul>
          ${orderDetails.items.map(
            (item) =>
              `<li>${item.name} x${item.quantity} - $${((item.price * item.quantity) / 100).toFixed(2)}</li>`
          ).join('')}
        </ul>
      `,
    });
  } catch (error) {
    console.error('Resend email error:', error);
    throw error;
  }
}

/**
 * Send vendor order notification email
 */
export async function sendVendorOrderNotification(
  to: string,
  orderId: string,
  vendorName: string,
  orderDetails: {
    items: Array<{ name: string; quantity: number }>;
    total: number;
  }
): Promise<void> {
  if (!resend) {
    console.warn('Resend not configured, skipping email:', { to, orderId });
    return;
  }

  try {
    await resend.emails.send({
      from: 'SafePlate <orders@safeplate.com>',
      to,
      subject: `New Order #${orderId} - Action Required`,
      html: `
        <h1>New Order Received</h1>
        <p>Hello ${vendorName},</p>
        <p>You have received a new order that requires your acceptance.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total:</strong> $${(orderDetails.total / 100).toFixed(2)}</p>
        <h2>Items:</h2>
        <ul>
          ${orderDetails.items.map(
            (item) => `<li>${item.name} x${item.quantity}</li>`
          ).join('')}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor/orders/${orderId}">View Order</a></p>
      `,
    });
  } catch (error) {
    console.error('Resend email error:', error);
    throw error;
  }
}

import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn('Twilio credentials not configured');
}

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send SMS notification to vendor
 */
export async function sendSMS(to: string, message: string): Promise<void> {
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured, skipping SMS:', { to, message });
    return;
  }

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
}

/**
 * Make voice call to vendor (Vendor Wake-up Call)
 */
export async function makeVoiceCall(
  to: string,
  message: string
): Promise<void> {
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured, skipping voice call:', { to, message });
    return;
  }

  try {
    // Create a TwiML response for the call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, message);
    
    await client.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: twiml.toString(),
    });
  } catch (error) {
    console.error('Twilio voice call error:', error);
    throw error;
  }
}

/**
 * Send vendor wake-up notification (SMS + Voice fallback)
 */
export async function notifyVendorWakeUp(
  vendorPhone: string,
  orderId: string,
  orderDetails: string
): Promise<void> {
  const message = `New order #${orderId} requires your attention: ${orderDetails}. Please accept or decline in your dashboard.`;
  
  try {
    // Try SMS first
    await sendSMS(vendorPhone, message);
  } catch (error) {
    console.error('SMS failed, trying voice call:', error);
    // Fallback to voice call
    await makeVoiceCall(vendorPhone, message);
  }
}

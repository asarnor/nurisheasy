import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Organization from '@/lib/models/organization.model';
import { DEFAULT_VENDOR_SETTINGS } from '@/lib/vendor-settings';

/**
 * POST /api/webhooks/clerk
 * Sync Clerk organizations with MongoDB
 */
export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET to your .env.local');
    }

    // Get the Svix headers for verification
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Error occurred -- no svix headers' },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: 'Error occurred' },
        { status: 400 }
      );
    }

    await connectDB();

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === 'organization.created') {
      const { id, name, slug, public_metadata: publicMetadata } = evt.data;
      const safeplateType =
        publicMetadata?.safeplateType === 'vendor' ? 'vendor' : 'consumer';

      await Organization.create({
        clerkOrgId: id,
        name: name || slug || 'Unnamed Organization',
        type: safeplateType,
        marketplaceVisible: safeplateType === 'vendor' ? false : undefined,
        vendorSettings: safeplateType === 'vendor' ? DEFAULT_VENDOR_SETTINGS : undefined,
        safetyProfile: {
          criticalAllergens: [],
          preferences: [],
          taxExempt: false,
        },
      });
    } else if (eventType === 'organization.updated') {
      const { id, name } = evt.data;

      await Organization.findOneAndUpdate(
        { clerkOrgId: id },
        { name },
        { upsert: true }
      );
    } else if (eventType === 'organization.deleted') {
      const { id } = evt.data;

      await Organization.findOneAndDelete({ clerkOrgId: id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { getMockVendorId, startMockDelivery } from '@/lib/mock-data';
import { startDeliveryForOrder, serializeDeliveryTracking } from '@/lib/delivery-service';

const startSchema = z.object({
  orderId: z.string().min(1),
  vendorId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, vendorId } = startSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json({ error: 'Vendor access required' }, { status: 403 });
      }

      const resolvedVendorId = getMockVendorId(vendorId);
      const tracking = startMockDelivery(orderId, resolvedVendorId);
      if (!tracking) {
        return NextResponse.json(
          { error: 'Unable to start delivery. Order must be delivery + READY.' },
          { status: 400 }
        );
      }

      return NextResponse.json({ delivery: tracking });
    }

    const organization = await getCurrentOrganization();
    if (!organization || organization.type !== 'vendor') {
      return NextResponse.json({ error: 'Vendor organization required' }, { status: 403 });
    }

    const result = await startDeliveryForOrder(orderId, organization._id.toString());
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const tracking = await serializeDeliveryTracking(result.delivery);
    return NextResponse.json({ delivery: tracking });
  } catch (error) {
    console.error('Error starting delivery:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to start delivery' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getMockVendorId, updateMockSubOrderStatus } from '@/lib/mock-data';

const updateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  vendorId: z.string().optional(),
});

/**
 * POST /api/orders/[orderId]/status
 * Debug-only endpoint to update sub-order status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    if (!(await shouldUseMockData(request))) {
      return NextResponse.json(
        { error: 'Status updates are only available in debug mode' },
        { status: 404 }
      );
    }

    const role = await getDebugRoleFromRequest(request);
    if (role !== 'vendor') {
      return NextResponse.json(
        { error: 'Vendor organization required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, vendorId } = updateStatusSchema.parse(body);
    const resolvedVendorId = getMockVendorId(vendorId);

    const order = updateMockSubOrderStatus(params.orderId, resolvedVendorId, status);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating order status:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

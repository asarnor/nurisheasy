import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { getMockVendorId, updateMockSubOrderStatus } from '@/lib/mock-data';
import { recomputeOrderStatus } from '@/lib/order-lifecycle';

// Vendors can advance their own sub-order through prep in production.
// Accept / Decline / Cancel go through their own dedicated endpoints.
const PROD_VENDOR_TRANSITIONS = new Set(['PREPARING', 'READY', 'DELIVERED']);

const updateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  vendorId: z.string().optional(),
});

/**
 * POST /api/orders/[orderId]/status
 * - Debug mode: unrestricted transitions (used by the mock KDS).
 * - Production: vendor-authenticated. Only the owning vendor may update their
 *   sub-order, and only to PREPARING / READY / DELIVERED (issue #6).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json();
    const { status, vendorId } = updateStatusSchema.parse(body);

    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      if (role !== 'vendor') {
        return NextResponse.json(
          { error: 'Vendor organization required' },
          { status: 403 }
        );
      }

      const resolvedVendorId = getMockVendorId(vendorId);
      const order = updateMockSubOrderStatus(
        params.orderId,
        resolvedVendorId,
        status
      );

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ order });
    }

    if (!PROD_VENDOR_TRANSITIONS.has(status)) {
      return NextResponse.json(
        {
          error: `Status ${status} cannot be set via this endpoint outside debug mode`,
        },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const subOrderIndex = order.subOrders.findIndex(
      (so) => so.vendorId.toString() === organization._id.toString()
    );
    if (subOrderIndex === -1) {
      return NextResponse.json(
        { error: 'Sub-order not found for this vendor' },
        { status: 404 }
      );
    }

    const current = order.subOrders[subOrderIndex].status;
    const allowed: Record<string, string[]> = {
      PREPARING: ['ACCEPTED'],
      READY: ['ACCEPTED', 'PREPARING'],
      DELIVERED: ['READY'],
    };

    if (!allowed[status]?.includes(current)) {
      return NextResponse.json(
        { error: `Invalid transition: ${current} → ${status}` },
        { status: 400 }
      );
    }

    order.subOrders[subOrderIndex].status = status as
      | 'PREPARING'
      | 'READY'
      | 'DELIVERED';

    recomputeOrderStatus(order);
    await order.save();

    return NextResponse.json({ order: order.toObject() });
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

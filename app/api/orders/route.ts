import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { acquireOrderLock, releaseOrderLock } from '@/lib/redis';
import { createPaymentIntent, calculatePlatformFee } from '@/lib/utils/stripe';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { createMockOrder, getMockOrders } from '@/lib/mock-data';

const orderSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
});

/**
 * POST /api/orders
 * Create a new order with safety validation and payment intent
 */
export async function POST(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const body = await request.json();
      const validatedData = orderSchema.parse(body);
      const order = createMockOrder(validatedData.items);

      if (!order) {
        return NextResponse.json(
          { error: 'No valid menu items found' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        orderId: order._id,
        paymentIntentId: order.paymentIntentId,
        clientSecret: `debug_${order.paymentIntentId}`,
        totalAmount: order.totalAmount,
        platformFee: order.platformFee,
        subOrders: order.subOrders,
      });
    }

    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization || organization.type !== 'consumer') {
      return NextResponse.json(
        { error: 'Consumer organization required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = orderSchema.parse(body);

    // Acquire lock to prevent double-ordering
    const lockAcquired = await acquireOrderLock(organization._id.toString(), 30);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Order already in progress. Please wait.' },
        { status: 429 }
      );
    }

    try {
      // Fetch menu items and group by vendor
      const menuItemIds = validatedData.items.map((item) => item.menuItemId);
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        isAvailable: true,
      }).populate('vendorId');

      if (menuItems.length !== menuItemIds.length) {
        throw new Error('Some menu items are not available');
      }

      // Group items by vendor
      const vendorGroups = new Map<string, typeof validatedData.items>();
      
      for (const item of validatedData.items) {
        const menuItem = menuItems.find((mi) => mi._id.toString() === item.menuItemId);
        if (!menuItem) continue;
        
        const vendorId = menuItem.vendorId._id.toString();
        if (!vendorGroups.has(vendorId)) {
          vendorGroups.set(vendorId, []);
        }
        vendorGroups.get(vendorId)!.push(item);
      }

      // Calculate totals and create sub-orders
      const subOrders = [];
      let totalAmount = 0;

      for (const [vendorId, items] of vendorGroups) {
        let vendorTotal = 0;
        const subOrderItems = [];

        for (const item of items) {
          const menuItem = menuItems.find((mi) => mi._id.toString() === item.menuItemId);
          if (!menuItem) continue;

          const itemTotal = menuItem.price * item.quantity;
          vendorTotal += itemTotal;

          subOrderItems.push({
            menuItemId: menuItem._id,
            name: menuItem.name,
            quantity: item.quantity,
            price: menuItem.price,
          });
        }

        subOrders.push({
          vendorId,
          status: 'PENDING',
          items: subOrderItems,
          vendorTotal,
        });

        totalAmount += vendorTotal;
      }

      const platformFee = calculatePlatformFee(totalAmount);

      // Create payment intent
      const paymentIntent = await createPaymentIntent(totalAmount, {
        consumerId: organization._id.toString(),
        orderType: 'multi_vendor',
      });

      // Create order (safety middleware will validate)
      const order = new Order({
        consumerId: organization._id,
        status: 'PROCESSING',
        paymentIntentId: paymentIntent.id,
        totalAmount,
        platformFee,
        subOrders,
      });

      await order.save();

      return NextResponse.json({
        orderId: order._id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        totalAmount,
        platformFee,
        subOrders: order.subOrders,
      });
    } finally {
      // Always release lock
      await releaseOrderLock(organization._id.toString());
    }
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('SAFETY BLOCK')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Get orders for current organization
 */
export async function GET(request: NextRequest) {
  try {
    if (await shouldUseMockData(request)) {
      const role = await getDebugRoleFromRequest(request);
      const searchParams = request.nextUrl.searchParams;
      const status = searchParams.get('status');
      const orderId = searchParams.get('orderId') || undefined;
      const vendorId = searchParams.get('debugVendorId') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);

      let orders = getMockOrders(role, { orderId, vendorId });

      if (status) {
        orders = orders.filter((order) => order.status === status);
      }

      return NextResponse.json({ orders: orders.slice(0, limit) });
    }

    await connectDB();
    
    const organization = await getCurrentOrganization();
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};
    
    if (organization.type === 'consumer') {
      query.consumerId = organization._id;
    } else if (organization.type === 'vendor') {
      query['subOrders.vendorId'] = organization._id;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('consumerId', 'name')
      .populate('subOrders.vendorId', 'name');

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

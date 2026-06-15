import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { acquireOrderLock, releaseOrderLock } from '@/lib/redis';
import { createPaymentIntent, calculatePlatformFee } from '@/lib/utils/stripe';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { createMockOrder, getMockOrders, getMockStore } from '@/lib/mock-data';
import {
  getActivePlatformRules,
  DEFAULT_RULES,
  validateOrderMinimums,
  validatePortionProtocols,
  validateDeliveryTiming,
  validateInventory,
  type RuleViolation,
} from '@/lib/platform-rules';

const orderSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  portionJustification: z.string().optional(),
  requestedDeliveryTime: z.string().datetime().optional(),
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

      // Validate against platform rules in mock mode
      const rules = DEFAULT_RULES;
      const violations: RuleViolation[] = [];

      // Delivery timing checks
      violations.push(...validateDeliveryTiming(
        rules.deliveryTiming,
        validatedData.requestedDeliveryTime ? new Date(validatedData.requestedDeliveryTime) : undefined,
      ));

      // Portion protocol checks
      const store = getMockStore();
      const itemsWithNames = validatedData.items.map((item) => {
        const menuItem = store.menuItems.find((m) => m.id === item.menuItemId);
        return { menuItemId: item.menuItemId, name: menuItem?.name || 'Unknown', quantity: item.quantity };
      });
      violations.push(...validatePortionProtocols(rules.portionProtocols, itemsWithNames, validatedData.portionJustification));

      if (violations.length > 0) {
        return NextResponse.json(
          { error: 'Platform rule violations', violations },
          { status: 400 },
        );
      }

      const order = createMockOrder(validatedData.items);

      if (!order) {
        return NextResponse.json(
          { error: 'No valid menu items found' },
          { status: 400 }
        );
      }

      // Validate order minimums after totals are calculated
      const vendorSubTotals = order.subOrders.map((sub) => ({
        vendorId: sub.vendorId,
        vendorName: sub.vendorName,
        total: sub.vendorTotal,
      }));
      const minimumViolations = validateOrderMinimums(rules.contractMinimums, order.totalAmount, vendorSubTotals);
      if (minimumViolations.length > 0) {
        return NextResponse.json(
          { error: 'Platform rule violations', violations: minimumViolations },
          { status: 400 },
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

    // Load platform rules for validation
    const platformRules = await getActivePlatformRules();
    const allViolations: RuleViolation[] = [];

    // Validate delivery timing
    allViolations.push(...validateDeliveryTiming(
      platformRules.deliveryTiming,
      validatedData.requestedDeliveryTime ? new Date(validatedData.requestedDeliveryTime) : undefined,
    ));

    // Validate portion protocols (names resolved after menu lookup below)
    const itemsForPortionCheck = validatedData.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItemId, // placeholder — replaced after menu lookup
      quantity: item.quantity,
    }));
    allViolations.push(...validatePortionProtocols(
      platformRules.portionProtocols,
      itemsForPortionCheck,
      validatedData.portionJustification,
    ));

    if (allViolations.length > 0) {
      return NextResponse.json(
        { error: 'Platform rule violations', violations: allViolations },
        { status: 400 },
      );
    }

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

      // Validate inventory for each item
      const inventoryViolations: RuleViolation[] = [];
      for (const reqItem of validatedData.items) {
        const menuItem = menuItems.find((mi) => mi._id.toString() === reqItem.menuItemId);
        if (!menuItem) continue;
        inventoryViolations.push(...validateInventory(
          platformRules.inventory,
          {
            id: menuItem._id.toString(),
            name: menuItem.name,
            stockQuantity: menuItem.stockQuantity,
            lastVerifiedAt: menuItem.lastVerifiedAt,
          },
          reqItem.quantity,
        ));
      }
      if (inventoryViolations.length > 0) {
        await releaseOrderLock(organization._id.toString());
        return NextResponse.json(
          { error: 'Inventory rule violations', violations: inventoryViolations },
          { status: 400 },
        );
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

      // Validate order and vendor minimums
      const vendorSubTotals = subOrders.map((sub) => {
        const vendor = menuItems.find((mi) => mi.vendorId._id.toString() === sub.vendorId)?.vendorId as any;
        return {
          vendorId: sub.vendorId,
          vendorName: vendor?.name || 'Vendor',
          total: sub.vendorTotal,
        };
      });
      const minimumViolations = validateOrderMinimums(
        platformRules.contractMinimums,
        totalAmount,
        vendorSubTotals,
      );
      if (minimumViolations.length > 0) {
        await releaseOrderLock(organization._id.toString());
        return NextResponse.json(
          { error: 'Order minimum violations', violations: minimumViolations },
          { status: 400 },
        );
      }

      // Use configurable platform fee instead of hardcoded 10%
      const feePercent = platformRules.platformFeePercent ?? 10;
      const platformFee = Math.round(totalAmount * (feePercent / 100));

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

      // Decrement stock quantities for items that track inventory
      if (platformRules.inventory.trackStock) {
        for (const reqItem of validatedData.items) {
          await MenuItem.updateOne(
            { _id: reqItem.menuItemId, stockQuantity: { $ne: null } },
            { $inc: { stockQuantity: -reqItem.quantity } },
          );
        }
      }

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

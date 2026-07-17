import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/order.model';
import Contract from '@/lib/models/contract.model';
import MenuItem from '@/lib/models/menu.model';
import { getCurrentOrganization } from '@/lib/utils/clerk';
import { acquireOrderLock, releaseOrderLock } from '@/lib/redis';
import { createPaymentIntent, calculatePlatformFee } from '@/lib/utils/stripe';
import { shouldUseMockData, getDebugRoleFromRequest } from '@/lib/utils/debug';
import { createMockOrder, getMockOrders, getMockStore } from '@/lib/mock-data';
import {
  calculateContractEndDate,
  DELIVERY_FEE_CENTS,
  DEFAULT_CONTRACT_OPTIONS,
  type OrderContractOptions,
} from '@/lib/contract-options';
import {
  getActivePlatformRules,
  DEFAULT_RULES,
  validateOrderMinimums,
  validatePortionProtocols,
  validateDeliveryTiming,
  validateInventory,
  type RuleViolation,
} from '@/lib/platform-rules';

const mealCategorySchema = z.enum(['breakfast', 'lunch', 'dinner']);

const contractOptionsSchema = z.object({
  contractDurationMonths: z.union([
    z.literal(3),
    z.literal(6),
    z.literal(9),
    z.literal(12),
  ]),
  preparationDayOfWeek: z.number().int().min(0).max(6),
  mealPeriods: z.array(mealCategorySchema).min(1),
  fulfillmentMethod: z.enum(['pickup', 'delivery']),
});

const orderSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  portionJustification: z.string().optional(),
  requestedDeliveryTime: z.string().datetime().optional(),
  contract: contractOptionsSchema.optional(),
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

      const rules = DEFAULT_RULES;
      const violations: RuleViolation[] = [];

      violations.push(...validateDeliveryTiming(
        rules.deliveryTiming,
        validatedData.requestedDeliveryTime ? new Date(validatedData.requestedDeliveryTime) : undefined,
      ));

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

      const order = createMockOrder(
        validatedData.items,
        validatedData.contract || DEFAULT_CONTRACT_OPTIONS
      );

      if (!order) {
        return NextResponse.json(
          { error: 'No valid menu items found' },
          { status: 400 }
        );
      }

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
        deliveryFeeCents: order.deliveryFeeCents,
        contractId: order.contractId,
        contract: order.contract,
        deliveryDetails: order.deliveryDetails,
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

    const platformRules = await getActivePlatformRules();
    const allViolations: RuleViolation[] = [];

    allViolations.push(...validateDeliveryTiming(
      platformRules.deliveryTiming,
      validatedData.requestedDeliveryTime ? new Date(validatedData.requestedDeliveryTime) : undefined,
    ));

    const itemsForPortionCheck = validatedData.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItemId,
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

    const lockAcquired = await acquireOrderLock(organization._id.toString(), 30);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Order already in progress. Please wait.' },
        { status: 429 }
      );
    }

    try {
      const menuItemIds = validatedData.items.map((item) => item.menuItemId);
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        isAvailable: true,
      }).populate('vendorId');

      if (menuItems.length !== menuItemIds.length) {
        throw new Error('Some menu items are not available');
      }

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

      const vendorGroups = new Map<string, typeof validatedData.items>();
      const vendorById = new Map<string, any>();

      for (const item of validatedData.items) {
        const menuItem = menuItems.find((mi) => mi._id.toString() === item.menuItemId);
        if (!menuItem) continue;

        const vendorId = menuItem.vendorId._id.toString();
        if (!vendorGroups.has(vendorId)) {
          vendorGroups.set(vendorId, []);
        }
        vendorGroups.get(vendorId)!.push(item);
        vendorById.set(vendorId, menuItem.vendorId);
      }

      const isContractLike = Boolean(validatedData.contract);

      // Build per-vendor sub-order payloads. When a contract is provided we
      // split into one Order per vendor below (Order = one delivery from one
      // Contract). Without a contract we keep a single multi-vendor Order.
      type VendorPayload = {
        vendorId: string;
        vendorName: string;
        vendorTotal: number;
        subOrder: {
          vendorId: string;
          status: 'PENDING';
          items: Array<{
            menuItemId: any;
            name: string;
            quantity: number;
            price: number;
          }>;
          vendorTotal: number;
        };
      };
      const vendorPayloads: VendorPayload[] = [];
      let combinedTotal = 0;

      for (const [vendorId, items] of vendorGroups) {
        let vendorTotal = 0;
        const subOrderItems: Array<{
          menuItemId: any;
          name: string;
          quantity: number;
          price: number;
        }> = [];

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

        const vendor = vendorById.get(vendorId) as any;

        vendorPayloads.push({
          vendorId,
          vendorName: vendor?.name || 'Vendor',
          vendorTotal,
          subOrder: {
            vendorId,
            status: 'PENDING',
            items: subOrderItems,
            vendorTotal,
          },
        });

        combinedTotal += vendorTotal;
      }

      const vendorSubTotals = vendorPayloads.map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        total: v.vendorTotal,
      }));
      const minimumViolations = validateOrderMinimums(
        platformRules.contractMinimums,
        combinedTotal,
        vendorSubTotals,
      );
      if (minimumViolations.length > 0) {
        await releaseOrderLock(organization._id.toString());
        return NextResponse.json(
          { error: 'Order minimum violations', violations: minimumViolations },
          { status: 400 },
        );
      }

      const feePercent = platformRules.platformFeePercent ?? 10;
      const contractOptions: OrderContractOptions = {
        ...DEFAULT_CONTRACT_OPTIONS,
        ...(validatedData.contract || {}),
        mealPeriods: validatedData.contract?.mealPeriods?.length
          ? validatedData.contract.mealPeriods
          : DEFAULT_CONTRACT_OPTIONS.mealPeriods,
      };
      const deliveryFeeCents =
        contractOptions.fulfillmentMethod === 'delivery' ? DELIVERY_FEE_CENTS : 0;
      const contractStartDate = new Date();
      const contractEndDate = calculateContractEndDate(
        contractStartDate,
        contractOptions.contractDurationMonths
      );

      const created: Array<{
        order: any;
        paymentIntent: any;
        contract?: any;
      }> = [];

      if (isContractLike) {
        // One Contract + one Order per vendor. Each Order gets its own PaymentIntent.
        for (const payload of vendorPayloads) {
          const vendor = vendorById.get(payload.vendorId) as any;
          const vendorMinimumOrderCents =
            vendor?.vendorSettings?.minimumOrderCents ??
            platformRules.contractMinimums.minimumVendorSubOrderCents ??
            0;

          // Reuse an existing ACTIVE contract if terms match; else create one.
          let contract = await Contract.findOne({
            consumerId: organization._id,
            vendorId: payload.vendorId,
            status: 'ACTIVE',
            durationMonths: contractOptions.contractDurationMonths,
            preparationDayOfWeek: contractOptions.preparationDayOfWeek,
            fulfillmentMethod: contractOptions.fulfillmentMethod,
          });

          if (!contract) {
            contract = await Contract.create({
              consumerId: organization._id,
              vendorId: payload.vendorId,
              durationMonths: contractOptions.contractDurationMonths,
              startDate: contractStartDate,
              endDate: contractEndDate,
              preparationDayOfWeek: contractOptions.preparationDayOfWeek,
              mealPeriods: contractOptions.mealPeriods,
              fulfillmentMethod: contractOptions.fulfillmentMethod,
              pricingTerms: {
                platformFeePercent: feePercent,
                minimumOrderCents: vendorMinimumOrderCents,
                contractFeeCents: 0,
              },
              status: 'ACTIVE',
              items: payload.subOrder.items.map((item) => ({
                menuItemId: item.menuItemId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
              lastGeneratedPrepDate: contractStartDate,
            });
          }

          const orderTotal = payload.vendorTotal + deliveryFeeCents;
          const orderPlatformFee = Math.round(orderTotal * (feePercent / 100));

          const paymentIntent = await createPaymentIntent(orderTotal, {
            consumerId: organization._id.toString(),
            contractId: contract._id.toString(),
            vendorId: payload.vendorId,
            orderType: 'contract_delivery',
          });

          const order = new Order({
            consumerId: organization._id,
            contractId: contract._id,
            status: 'PROCESSING',
            paymentIntentId: paymentIntent.id,
            totalAmount: orderTotal,
            platformFee: orderPlatformFee,
            subOrders: [payload.subOrder],
            deliveryFeeCents,
          });

          await order.save();

          created.push({ order, paymentIntent, contract });
        }
      } else {
        // One-off order — keep the multi-vendor Order shape.
        const totalAmount = combinedTotal + deliveryFeeCents;
        const platformFee = Math.round(totalAmount * (feePercent / 100));
        const paymentIntent = await createPaymentIntent(totalAmount, {
          consumerId: organization._id.toString(),
          orderType: 'multi_vendor',
        });

        const order = new Order({
          consumerId: organization._id,
          status: 'PROCESSING',
          paymentIntentId: paymentIntent.id,
          totalAmount,
          platformFee,
          subOrders: vendorPayloads.map((v) => v.subOrder),
          deliveryFeeCents,
          deliveryDetails: {
            preparationDayOfWeek: contractOptions.preparationDayOfWeek,
            mealPeriods: contractOptions.mealPeriods,
            fulfillmentMethod: contractOptions.fulfillmentMethod,
          },
        });

        await order.save();

        created.push({ order, paymentIntent });
      }

      if (platformRules.inventory.trackStock) {
        for (const reqItem of validatedData.items) {
          await MenuItem.updateOne(
            { _id: reqItem.menuItemId, stockQuantity: { $ne: null } },
            { $inc: { stockQuantity: -reqItem.quantity } },
          );
        }
      }

      const serializeContract = (contract: any) =>
        contract
          ? {
              _id: contract._id,
              consumerId: contract.consumerId,
              vendorId: contract.vendorId,
              durationMonths: contract.durationMonths,
              startDate: contract.startDate,
              endDate: contract.endDate,
              preparationDayOfWeek: contract.preparationDayOfWeek,
              mealPeriods: contract.mealPeriods,
              fulfillmentMethod: contract.fulfillmentMethod,
              pricingTerms: contract.pricingTerms,
              status: contract.status,
            }
          : undefined;

      // Preserve legacy single-order response shape when there is one Order.
      if (created.length === 1) {
        const { order, paymentIntent, contract } = created[0];
        return NextResponse.json({
          orderId: order._id,
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          totalAmount: order.totalAmount,
          platformFee: order.platformFee,
          subOrders: order.subOrders,
          status: order.status,
          contractId: contract?._id,
          contract: serializeContract(contract),
        });
      }

      return NextResponse.json({
        orders: created.map(({ order, paymentIntent, contract }) => ({
          orderId: order._id,
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          totalAmount: order.totalAmount,
          platformFee: order.platformFee,
          subOrders: order.subOrders,
          status: order.status,
          contractId: contract?._id,
          contract: serializeContract(contract),
        })),
      });
    } finally {
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
      .populate('subOrders.vendorId', 'name')
      .populate('contractId');

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

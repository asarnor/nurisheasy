import connectDB from '@/lib/mongodb';
import Contract, { IContract } from '@/lib/models/contract.model';
import Order from '@/lib/models/order.model';
import { createPaymentIntent } from '@/lib/utils/stripe';
import { shouldUseMockData } from '@/lib/utils/debug';
import { getMockStore, type MockOrder } from '@/lib/mock-data';
import { DELIVERY_FEE_CENTS } from '@/lib/contract-options';

export interface GeneratedContractOrder {
  contractId: string;
  orderId: string;
  paymentIntentId: string;
  totalAmount: number;
  vendorId: string;
}

export interface GenerateContractOrdersResult {
  generated: GeneratedContractOrder[];
  skipped: Array<{ contractId: string; reason: string }>;
}

/**
 * Returns true when today's day-of-week matches `preparationDayOfWeek` and no
 * order has been generated yet for this prep cycle (this week).
 */
export function isDueForGeneration(
  contract: {
    preparationDayOfWeek: number;
    lastGeneratedPrepDate?: Date | string | null;
    status: string;
    endDate?: Date | string | null;
  },
  now: Date = new Date()
): boolean {
  if (contract.status !== 'ACTIVE') return false;

  const endDate = contract.endDate ? new Date(contract.endDate) : null;
  if (endDate && endDate.getTime() < now.getTime()) return false;

  if (now.getDay() !== contract.preparationDayOfWeek) return false;

  const last = contract.lastGeneratedPrepDate
    ? new Date(contract.lastGeneratedPrepDate)
    : null;
  if (!last) return true;

  const dayMs = 24 * 60 * 60 * 1000;
  return now.getTime() - last.getTime() >= 6 * dayMs;
}

const sumItems = (
  items: Array<{ quantity: number; price: number }>
): number => items.reduce((total, item) => total + item.price * item.quantity, 0);

async function generateForMockStore(now: Date): Promise<GenerateContractOrdersResult> {
  const store = getMockStore();
  const generated: GeneratedContractOrder[] = [];
  const skipped: Array<{ contractId: string; reason: string }> = [];

  for (const contract of store.contracts) {
    if (!isDueForGeneration(contract, now)) {
      skipped.push({ contractId: contract._id, reason: 'not-due' });
      continue;
    }
    if (!contract.items?.length) {
      skipped.push({ contractId: contract._id, reason: 'no-items' });
      continue;
    }

    const vendor = store.organizations.vendors.find(
      (entry) => entry.id === contract.vendorId
    );
    const vendorTotal = sumItems(contract.items);
    const deliveryFeeCents =
      contract.fulfillmentMethod === 'delivery' ? DELIVERY_FEE_CENTS : 0;
    const orderTotal = vendorTotal + deliveryFeeCents;

    const order: MockOrder = {
      _id: `order_mock_${Date.now()}_${contract._id.slice(-6)}`,
      status: 'PROCESSING',
      paymentIntentId: `pi_mock_${Date.now()}_${contract._id.slice(-6)}`,
      totalAmount: orderTotal,
      platformFee: Math.round(
        (orderTotal * (contract.pricingTerms.platformFeePercent ?? 10)) / 100
      ),
      createdAt: now.toISOString(),
      consumerId: {
        _id: store.organizations.consumer.id,
        name: store.organizations.consumer.name,
      },
      contractId: contract._id,
      contract,
      deliveryFeeCents,
      subOrders: [
        {
          vendorId: contract.vendorId,
          vendorName: vendor?.name || 'Vendor',
          status: 'PENDING',
          items: contract.items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          vendorTotal,
        },
      ],
    };

    store.orders.unshift(order);
    contract.lastGeneratedPrepDate = now.toISOString();

    generated.push({
      contractId: contract._id,
      orderId: order._id,
      paymentIntentId: order.paymentIntentId,
      totalAmount: order.totalAmount,
      vendorId: contract.vendorId,
    });
  }

  return { generated, skipped };
}

async function generateForDatabase(now: Date): Promise<GenerateContractOrdersResult> {
  await connectDB();

  const generated: GeneratedContractOrder[] = [];
  const skipped: Array<{ contractId: string; reason: string }> = [];

  const contracts = await Contract.find({
    status: 'ACTIVE',
    preparationDayOfWeek: now.getDay(),
  });

  for (const contract of contracts as IContract[]) {
    if (!isDueForGeneration(contract, now)) {
      skipped.push({ contractId: contract._id.toString(), reason: 'not-due' });
      continue;
    }
    if (!contract.items?.length) {
      skipped.push({ contractId: contract._id.toString(), reason: 'no-items' });
      continue;
    }

    const vendorTotal = sumItems(contract.items);
    const deliveryFeeCents =
      contract.fulfillmentMethod === 'delivery' ? DELIVERY_FEE_CENTS : 0;
    const orderTotal = vendorTotal + deliveryFeeCents;
    const platformFee = Math.round(
      (orderTotal * (contract.pricingTerms.platformFeePercent ?? 10)) / 100
    );

    try {
      const paymentIntent = await createPaymentIntent(orderTotal, {
        consumerId: contract.consumerId.toString(),
        contractId: contract._id.toString(),
        vendorId: contract.vendorId.toString(),
        orderType: 'contract_delivery',
        generatedBy: 'generate-contract-orders',
      });

      const order = new Order({
        consumerId: contract.consumerId,
        contractId: contract._id,
        status: 'PROCESSING',
        paymentIntentId: paymentIntent.id,
        totalAmount: orderTotal,
        platformFee,
        deliveryFeeCents,
        subOrders: [
          {
            vendorId: contract.vendorId,
            status: 'PENDING',
            items: contract.items.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            vendorTotal,
          },
        ],
      });

      await order.save();

      contract.lastGeneratedPrepDate = now;
      await contract.save();

      generated.push({
        contractId: contract._id.toString(),
        orderId: order._id.toString(),
        paymentIntentId: paymentIntent.id,
        totalAmount: orderTotal,
        vendorId: contract.vendorId.toString(),
      });
    } catch (error) {
      console.error(
        `Failed to generate order for contract ${contract._id}:`,
        error
      );
      skipped.push({
        contractId: contract._id.toString(),
        reason: (error as Error).message || 'error',
      });
    }
  }

  return { generated, skipped };
}

/**
 * Generate a new PENDING Order for every ACTIVE Contract whose
 * preparationDayOfWeek matches today (skipping duplicates in the current
 * prep cycle). Called by cron via `/api/jobs/generate-contract-orders`.
 */
export async function generateContractOrders(
  now: Date = new Date()
): Promise<GenerateContractOrdersResult> {
  const useMock = await shouldUseMockData();
  if (useMock) {
    return generateForMockStore(now);
  }
  return generateForDatabase(now);
}

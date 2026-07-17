import PlatformRule, {
  IPlatformRule,
  IInventoryRules,
  IDeliveryTimingRules,
  IContractMinimumRules,
  IPortionProtocolRules,
} from '@/lib/models/platform-rule.model';

export const DEFAULT_RULES = {
  inventory: {
    trackStock: true,
    lowStockThreshold: 10,
    autoDisableAtZero: true,
    requireDailyVerification: false,
    verificationWindowHours: 24,
  } satisfies IInventoryRules,

  deliveryTiming: {
    maxPrepTimeMinutes: 60,
    defaultDeliveryWindowMinutes: 45,
    orderCutoffTime: '20:00',
    advanceOrderMinHours: 1,
    // Bumped from 15 → 30 per issue #6 (auto-expire at 30 min, configurable via PlatformRule)
    vendorAcceptanceTimeoutMinutes: 30,
    lateDeliveryThresholdMinutes: 15,
  } satisfies IDeliveryTimingRules,

  contractMinimums: {
    minimumOrderAmountCents: 2000,
    minimumVendorSubOrderCents: 1000,
    minimumMonthlyOrderCount: 0,
    minimumWeeklyMenuItems: 3,
    contractRenewalDays: 90,
  } satisfies IContractMinimumRules,

  portionProtocols: {
    maxPortionsPerItem: 25,
    maxItemsPerOrder: 50,
    maxOrdersPerDay: 5,
    requirePortionJustification: true,
    portionJustificationThreshold: 10,
    defaultServingSizeOz: 8,
    maxServingSizeOz: 16,
  } satisfies IPortionProtocolRules,

  platformFeePercent: 10,
  deliveryRadiusKm: 10,
} as const;

let cachedRules: IPlatformRule | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get active platform rules. Falls back to defaults if none exist in the database.
 */
export async function getActivePlatformRules(): Promise<IPlatformRule> {
  const now = Date.now();
  if (cachedRules && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRules;
  }

  try {
    const rules = await PlatformRule.findOne({ isActive: true }).sort({ version: -1 });
    if (rules) {
      cachedRules = rules;
      cacheTimestamp = now;
      return rules;
    }
  } catch {
    // Database not connected or error — fall through to defaults
  }

  return {
    ...DEFAULT_RULES,
    version: 0,
    isActive: true,
  } as unknown as IPlatformRule;
}

export function invalidateRulesCache() {
  cachedRules = null;
  cacheTimestamp = 0;
}

// ─── Validation helpers ───────────────────────────────────────────

export interface RuleViolation {
  rule: string;
  message: string;
  field?: string;
  limit?: number;
  actual?: number;
}

export function validateOrderMinimums(
  rules: IContractMinimumRules,
  totalAmountCents: number,
  vendorSubTotals: { vendorId: string; vendorName: string; total: number }[],
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (totalAmountCents < rules.minimumOrderAmountCents) {
    violations.push({
      rule: 'contractMinimums.minimumOrderAmountCents',
      message: `Order total $${(totalAmountCents / 100).toFixed(2)} is below the minimum of $${(rules.minimumOrderAmountCents / 100).toFixed(2)}`,
      limit: rules.minimumOrderAmountCents,
      actual: totalAmountCents,
    });
  }

  for (const sub of vendorSubTotals) {
    if (sub.total < rules.minimumVendorSubOrderCents) {
      violations.push({
        rule: 'contractMinimums.minimumVendorSubOrderCents',
        message: `Sub-order for ${sub.vendorName} ($${(sub.total / 100).toFixed(2)}) is below the vendor minimum of $${(rules.minimumVendorSubOrderCents / 100).toFixed(2)}`,
        field: sub.vendorId,
        limit: rules.minimumVendorSubOrderCents,
        actual: sub.total,
      });
    }
  }

  return violations;
}

export function validatePortionProtocols(
  rules: IPortionProtocolRules,
  items: { menuItemId: string; name: string; quantity: number }[],
  justification?: string,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (items.length > rules.maxItemsPerOrder) {
    violations.push({
      rule: 'portionProtocols.maxItemsPerOrder',
      message: `Order contains ${items.length} unique items, exceeding the maximum of ${rules.maxItemsPerOrder}`,
      limit: rules.maxItemsPerOrder,
      actual: items.length,
    });
  }

  for (const item of items) {
    if (item.quantity > rules.maxPortionsPerItem) {
      violations.push({
        rule: 'portionProtocols.maxPortionsPerItem',
        message: `"${item.name}" quantity of ${item.quantity} exceeds the maximum of ${rules.maxPortionsPerItem} portions per item`,
        field: item.menuItemId,
        limit: rules.maxPortionsPerItem,
        actual: item.quantity,
      });
    }
  }

  if (rules.requirePortionJustification) {
    const needsJustification = items.some(
      (item) => item.quantity >= rules.portionJustificationThreshold,
    );
    if (needsJustification && !justification) {
      violations.push({
        rule: 'portionProtocols.requirePortionJustification',
        message: `Orders with ${rules.portionJustificationThreshold}+ portions of any item require a justification note`,
      });
    }
  }

  return violations;
}

export function validateDeliveryTiming(
  rules: IDeliveryTimingRules,
  requestedDate?: Date,
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const now = new Date();

  const [cutoffHour, cutoffMinute] = rules.orderCutoffTime.split(':').map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

  if (now > cutoff) {
    violations.push({
      rule: 'deliveryTiming.orderCutoffTime',
      message: `Orders cannot be placed after ${rules.orderCutoffTime}. Please order again tomorrow.`,
    });
  }

  if (requestedDate && rules.advanceOrderMinHours > 0) {
    const minLeadTime = rules.advanceOrderMinHours * 60 * 60 * 1000;
    const leadTime = requestedDate.getTime() - now.getTime();
    if (leadTime < minLeadTime) {
      violations.push({
        rule: 'deliveryTiming.advanceOrderMinHours',
        message: `Orders require at least ${rules.advanceOrderMinHours} hour(s) advance notice`,
        limit: rules.advanceOrderMinHours,
      });
    }
  }

  return violations;
}

export function validateInventory(
  rules: IInventoryRules,
  item: { id: string; name: string; stockQuantity?: number | null; lastVerifiedAt?: Date | null },
  requestedQuantity: number,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (!rules.trackStock) return violations;

  if (item.stockQuantity != null) {
    if (rules.autoDisableAtZero && item.stockQuantity <= 0) {
      violations.push({
        rule: 'inventory.autoDisableAtZero',
        message: `"${item.name}" is out of stock`,
        field: item.id,
        actual: 0,
      });
    } else if (requestedQuantity > item.stockQuantity) {
      violations.push({
        rule: 'inventory.stockQuantity',
        message: `"${item.name}" only has ${item.stockQuantity} in stock (requested ${requestedQuantity})`,
        field: item.id,
        limit: item.stockQuantity,
        actual: requestedQuantity,
      });
    }
  }

  if (rules.requireDailyVerification && item.lastVerifiedAt) {
    const hoursElapsed = (Date.now() - new Date(item.lastVerifiedAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > rules.verificationWindowHours) {
      violations.push({
        rule: 'inventory.requireDailyVerification',
        message: `"${item.name}" inventory has not been verified in the last ${rules.verificationWindowHours} hours`,
        field: item.id,
      });
    }
  }

  return violations;
}

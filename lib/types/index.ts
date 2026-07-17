/**
 * Shared TypeScript types for SafePlate
 */

export type OrganizationType = 'consumer' | 'vendor';

export type OrderStatus = 'PROCESSING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export type SubOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'REFUNDED'
  | 'CANCELLED';

export type AllergenTag =
  | 'PEANUT'
  | 'TREE_NUT'
  | 'SHELLFISH'
  | 'FISH'
  | 'EGG'
  | 'DAIRY'
  | 'SOY'
  | 'WHEAT'
  | 'GLUTEN'
  | 'SESAME';

export type PreferenceTag =
  | 'LOW_SODIUM'
  | 'LOW_FAT'
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'KOSHER'
  | 'HALAL';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: Coordinates;
}

export interface SafetyProfile {
  criticalAllergens: AllergenTag[];
  preferences: PreferenceTag[];
  taxExempt: boolean;
}

// ─── Platform Rules Types ─────────────────────────────────────────

export interface InventoryRules {
  trackStock: boolean;
  lowStockThreshold: number;
  autoDisableAtZero: boolean;
  requireDailyVerification: boolean;
  verificationWindowHours: number;
}

export interface DeliveryTimingRules {
  maxPrepTimeMinutes: number;
  defaultDeliveryWindowMinutes: number;
  orderCutoffTime: string;
  advanceOrderMinHours: number;
  vendorAcceptanceTimeoutMinutes: number;
  lateDeliveryThresholdMinutes: number;
}

export interface ContractMinimumRules {
  minimumOrderAmountCents: number;
  minimumVendorSubOrderCents: number;
  minimumMonthlyOrderCount: number;
  minimumWeeklyMenuItems: number;
  contractRenewalDays: number;
}

export interface PortionProtocolRules {
  maxPortionsPerItem: number;
  maxItemsPerOrder: number;
  maxOrdersPerDay: number;
  requirePortionJustification: boolean;
  portionJustificationThreshold: number;
  defaultServingSizeOz: number;
  maxServingSizeOz: number;
}

export interface PlatformRules {
  inventory: InventoryRules;
  deliveryTiming: DeliveryTimingRules;
  contractMinimums: ContractMinimumRules;
  portionProtocols: PortionProtocolRules;
  platformFeePercent: number;
  deliveryRadiusKm: number;
}

export type ContractDurationMonths = 3 | 6 | 9 | 12;

export type FulfillmentMethod = 'pickup' | 'delivery';

export type ContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ENDED'
  | 'CANCELLED';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

export interface ContractPricingTerms {
  platformFeePercent: number;
  minimumOrderCents: number;
  contractFeeCents: number;
}

export interface ContractItemSummary {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

/**
 * Serialized Contract as returned by APIs / used by UI. Represents the recurring
 * consumer↔vendor agreement that generates Orders (one delivery each).
 */
export interface ContractSummary {
  _id: string;
  consumerId: string;
  vendorId: string;
  durationMonths: ContractDurationMonths;
  startDate: string;
  endDate: string;
  preparationDayOfWeek: number;
  mealPeriods: MealPeriod[];
  fulfillmentMethod: FulfillmentMethod;
  pricingTerms: ContractPricingTerms;
  status: ContractStatus;
  items?: ContractItemSummary[];
  lastGeneratedPrepDate?: string;
}

/**
 * Derived, display-friendly contract details for an Order. Prefers populated
 * Contract data; falls back to per-delivery details on the Order (one-offs).
 */
export interface OrderContractDetails {
  contractDurationMonths?: ContractDurationMonths;
  preparationDayOfWeek?: number;
  mealPeriods?: MealPeriod[];
  fulfillmentMethod?: FulfillmentMethod;
  deliveryFeeCents?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractStatus?: ContractStatus;
}

/** Order shape input for `getOrderContractDetails`. */
export interface OrderWithContract {
  deliveryFeeCents?: number;
  deliveryDetails?: {
    preparationDayOfWeek?: number;
    mealPeriods?: MealPeriod[];
    fulfillmentMethod?: FulfillmentMethod;
  };
  contract?: Partial<ContractSummary> | null;
  contractId?: string | Partial<ContractSummary> | null;
}

/**
 * Read contract details from an Order for UI. Prefers populated `contract` /
 * `contractId` document; falls back to `deliveryDetails` for one-off orders.
 */
export function getOrderContractDetails(
  order: OrderWithContract | null | undefined
): OrderContractDetails {
  if (!order) return {};

  const populatedContract: Partial<ContractSummary> | null | undefined =
    order.contract ||
    (order.contractId && typeof order.contractId === 'object'
      ? (order.contractId as Partial<ContractSummary>)
      : null);

  if (populatedContract) {
    return {
      contractDurationMonths: populatedContract.durationMonths,
      preparationDayOfWeek: populatedContract.preparationDayOfWeek,
      mealPeriods: populatedContract.mealPeriods,
      fulfillmentMethod: populatedContract.fulfillmentMethod,
      contractStartDate:
        typeof populatedContract.startDate === 'string'
          ? populatedContract.startDate
          : undefined,
      contractEndDate:
        typeof populatedContract.endDate === 'string'
          ? populatedContract.endDate
          : undefined,
      contractStatus: populatedContract.status,
      deliveryFeeCents: order.deliveryFeeCents,
    };
  }

  return {
    preparationDayOfWeek: order.deliveryDetails?.preparationDayOfWeek,
    mealPeriods: order.deliveryDetails?.mealPeriods,
    fulfillmentMethod: order.deliveryDetails?.fulfillmentMethod,
    deliveryFeeCents: order.deliveryFeeCents,
  };
}

export interface VendorReview {
  id: string;
  orderId: string;
  vendorId: string;
  consumerId: string;
  consumerName: string;
  rating: number;
  comment?: string;
  fulfillmentMethod: FulfillmentMethod;
  createdAt: string;
}

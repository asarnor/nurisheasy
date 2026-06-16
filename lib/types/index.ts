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

export interface ContractTerms {
  customMinimumOrderCents?: number;
  customDeliveryRadiusKm?: number;
  customPlatformFeePercent?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  isActive: boolean;
}

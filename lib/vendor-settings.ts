import {
  CONTRACT_DURATIONS_MONTHS,
  DELIVERY_FEE_CENTS,
  type ContractDurationMonths,
} from '@/lib/contract-options';
import { MEAL_CATEGORIES, type MealCategory } from '@/lib/meal-categories';

export const VENDOR_CERTIFICATIONS = [
  { id: 'KOSHER', label: 'Kosher certified' },
  { id: 'HALAL', label: 'Halal certified' },
  { id: 'NUT_FREE_KITCHEN', label: 'Nut-free kitchen' },
  { id: 'GLUTEN_FREE_FACILITY', label: 'Gluten-free facility' },
  { id: 'ORGANIC', label: 'Organic ingredients' },
  { id: 'LOCALLY_SOURCED', label: 'Locally sourced' },
] as const;

export type VendorCertification = (typeof VENDOR_CERTIFICATIONS)[number]['id'];

export interface VendorSettings {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  logoUrl: string;
  offersPickup: boolean;
  offersDelivery: boolean;
  deliveryRadiusKm: number;
  preparationDays: number[];
  mealPeriods: MealCategory[];
  orderCutoffTime: string;
  advanceOrderMinHours: number;
  defaultPrepTimeMinutes: number;
  autoAcceptOrders: boolean;
  kdsSoundEnabled: boolean;
  certifications: VendorCertification[];
  allergenPolicyNotes: string;
  ingredientSourcingNotes: string;
  offeredContractDurations: ContractDurationMonths[];
  minimumOrderCents: number;
  deliveryFeeCents: number;
  acceptingNewContracts: boolean;
  notifyNewOrder: boolean;
  notifyLateAcceptance: boolean;
  notifyNewReview: boolean;
  notifyContractEnding: boolean;
  notificationQuietHoursStart: string;
  notificationQuietHoursEnd: string;
}

export const DEFAULT_VENDOR_SETTINGS: VendorSettings = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  description: '',
  logoUrl: '',
  offersPickup: true,
  offersDelivery: true,
  deliveryRadiusKm: 15,
  preparationDays: [1, 3, 5],
  mealPeriods: ['breakfast', 'lunch', 'dinner'],
  orderCutoffTime: '20:00',
  advanceOrderMinHours: 24,
  defaultPrepTimeMinutes: 60,
  autoAcceptOrders: false,
  kdsSoundEnabled: true,
  certifications: [],
  allergenPolicyNotes: '',
  ingredientSourcingNotes: '',
  offeredContractDurations: [...CONTRACT_DURATIONS_MONTHS],
  minimumOrderCents: 2000,
  deliveryFeeCents: DELIVERY_FEE_CENTS,
  acceptingNewContracts: true,
  notifyNewOrder: true,
  notifyLateAcceptance: true,
  notifyNewReview: true,
  notifyContractEnding: true,
  notificationQuietHoursStart: '22:00',
  notificationQuietHoursEnd: '07:00',
};

export const mergeVendorSettings = (
  partial?: Partial<VendorSettings> | null
): VendorSettings => ({
  ...DEFAULT_VENDOR_SETTINGS,
  ...partial,
  preparationDays: partial?.preparationDays?.length
    ? partial.preparationDays
    : DEFAULT_VENDOR_SETTINGS.preparationDays,
  mealPeriods: partial?.mealPeriods?.length
    ? partial.mealPeriods
    : DEFAULT_VENDOR_SETTINGS.mealPeriods,
  offeredContractDurations: partial?.offeredContractDurations?.length
    ? partial.offeredContractDurations
    : DEFAULT_VENDOR_SETTINGS.offeredContractDurations,
  certifications: partial?.certifications ?? DEFAULT_VENDOR_SETTINGS.certifications,
});

export const formatCentsAsDollars = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

export const parseDollarsToCents = (value: string): number => {
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};

export const toggleArrayItem = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter((entry) => entry !== item) : [...array, item];

import type { MealCategory } from '@/lib/meal-categories';

export const CONTRACT_DURATIONS_MONTHS = [3, 6, 9, 12] as const;
export type ContractDurationMonths = (typeof CONTRACT_DURATIONS_MONTHS)[number];

export const PREPARATION_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export type FulfillmentMethod = 'pickup' | 'delivery';

/** Flat delivery surcharge per order when delivery is selected. */
export const DELIVERY_FEE_CENTS = 1500;

export interface OrderContractOptions {
  contractDurationMonths: ContractDurationMonths;
  preparationDayOfWeek: number;
  mealPeriods: MealCategory[];
  fulfillmentMethod: FulfillmentMethod;
}

export const DEFAULT_CONTRACT_OPTIONS: OrderContractOptions = {
  contractDurationMonths: 3,
  preparationDayOfWeek: 1,
  mealPeriods: ['dinner'],
  fulfillmentMethod: 'pickup',
};

export const isContractDurationMonths = (
  value: number
): value is ContractDurationMonths =>
  CONTRACT_DURATIONS_MONTHS.includes(value as ContractDurationMonths);

export const getPreparationDayLabel = (day: number): string =>
  PREPARATION_DAYS.find((entry) => entry.value === day)?.label || 'Monday';

export const calculateContractEndDate = (
  startDate: Date,
  durationMonths: ContractDurationMonths
): Date => {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + durationMonths);
  return end;
};

export const formatContractDuration = (months: ContractDurationMonths): string =>
  `${months} months`;

export const formatContractDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getDaysUntilContractEnd = (endDate?: string | Date | null): number | null => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatFulfillmentMethod = (method?: FulfillmentMethod): string =>
  method === 'delivery' ? 'Delivery' : 'Pickup';

'use client';

import React from 'react';
import {
  CONTRACT_DURATIONS_MONTHS,
  DEFAULT_CONTRACT_OPTIONS,
  DELIVERY_FEE_CENTS,
  PREPARATION_DAYS,
  type ContractDurationMonths,
  type FulfillmentMethod,
  type OrderContractOptions,
} from '@/lib/contract-options';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';

export interface MenuItemOrderOptionsValue {
  quantity: number;
  contractDurationMonths: ContractDurationMonths;
  preparationDays: number[];
  mealPeriod: MealCategory;
  fulfillmentMethod: FulfillmentMethod;
}

interface MenuItemOrderOptionsProps {
  value: MenuItemOrderOptionsValue;
  onChange: (value: MenuItemOrderOptionsValue) => void;
  inputNamePrefix?: string;
  offeredContractDurations?: ContractDurationMonths[];
  preparationDays?: number[];
  mealPeriods?: MealCategory[];
  offersPickup?: boolean;
  offersDelivery?: boolean;
  compact?: boolean;
}

export const MenuItemOrderOptions: React.FC<MenuItemOrderOptionsProps> = ({
  value,
  onChange,
  inputNamePrefix = 'menu-item',
  offeredContractDurations = [...CONTRACT_DURATIONS_MONTHS],
  preparationDays = PREPARATION_DAYS.map((day) => day.value),
  mealPeriods = [...MEAL_CATEGORIES],
  offersPickup = true,
  offersDelivery = true,
  compact = false,
}) => {
  const availablePrepDays = PREPARATION_DAYS.filter((day) =>
    preparationDays.includes(day.value)
  );

  const togglePreparationDay = (day: number) => {
    const selected = value.preparationDays.includes(day)
      ? value.preparationDays.filter((entry) => entry !== day)
      : [...value.preparationDays, day].sort((left, right) => left - right);

    onChange({
      ...value,
      preparationDays: selected.length ? selected : [day],
    });
  };

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Number of dishes
        </label>
        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80">
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, quantity: Math.max(1, value.quantity - 1) })
            }
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-l-xl"
          >
            −
          </button>
          <span className="min-w-[2.5rem] px-3 text-center text-sm font-semibold text-slate-800">
            {value.quantity}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...value, quantity: value.quantity + 1 })}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-r-xl"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contract length
        </label>
        <div className="flex flex-wrap gap-2">
          {offeredContractDurations.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => onChange({ ...value, contractDurationMonths: months })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                value.contractDurationMonths === months
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {months} mo
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preparation / delivery days
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Select one or more days each week for prep or delivery.
        </p>
        <div className="flex flex-wrap gap-2">
          {availablePrepDays.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => togglePreparationDay(day.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                value.preparationDays.includes(day.value)
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Meal period
        </label>
        <div className="flex flex-wrap gap-2">
          {mealPeriods.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => onChange({ ...value, mealPeriod: meal })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                value.mealPeriod === meal
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {MEAL_CATEGORY_LABELS[meal]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fulfillment
        </label>
        <div className="grid gap-2">
          {offersPickup && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="radio"
                name={`${inputNamePrefix}-fulfillment`}
                checked={value.fulfillmentMethod === 'pickup'}
                onChange={() => onChange({ ...value, fulfillmentMethod: 'pickup' })}
              />
              <span className="text-sm text-slate-700">Pickup</span>
            </label>
          )}
          {offersDelivery && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="radio"
                name={`${inputNamePrefix}-fulfillment`}
                checked={value.fulfillmentMethod === 'delivery'}
                onChange={() => onChange({ ...value, fulfillmentMethod: 'delivery' })}
              />
              <span className="text-sm text-slate-700">
                Delivery (+${(DELIVERY_FEE_CENTS / 100).toFixed(2)})
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export const buildMenuItemOrderDefaults = (
  defaults?: Partial<OrderContractOptions>,
  mealPeriod?: MealCategory,
  availablePreparationDays?: number[]
): MenuItemOrderOptionsValue => {
  const defaultDay =
    defaults?.preparationDayOfWeek ?? DEFAULT_CONTRACT_OPTIONS.preparationDayOfWeek;
  const initialDay =
    availablePreparationDays?.includes(defaultDay)
      ? defaultDay
      : availablePreparationDays?.[0] ?? defaultDay;

  return {
    quantity: 1,
    contractDurationMonths: defaults?.contractDurationMonths || 3,
    preparationDays: [initialDay],
    mealPeriod: mealPeriod || defaults?.mealPeriods?.[0] || 'dinner',
    fulfillmentMethod: defaults?.fulfillmentMethod || 'pickup',
  };
};

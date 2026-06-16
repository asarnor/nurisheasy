'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  CONTRACT_DURATIONS_MONTHS,
  DELIVERY_FEE_CENTS,
  PREPARATION_DAYS,
  type OrderContractOptions,
} from '@/lib/contract-options';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';

interface ContractCheckoutOptionsProps {
  value: OrderContractOptions;
  onChange: (value: OrderContractOptions) => void;
}

export const ContractCheckoutOptions: React.FC<ContractCheckoutOptionsProps> = ({
  value,
  onChange,
}) => {
  const toggleMealPeriod = (meal: MealCategory) => {
    const selected = value.mealPeriods.includes(meal)
      ? value.mealPeriods.filter((entry) => entry !== meal)
      : [...value.mealPeriods, meal];

    onChange({
      ...value,
      mealPeriods: selected.length ? selected : ['dinner'],
    });
  };

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Contract & schedule</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set your food service agreement and weekly preparation schedule.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Contract length
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_DURATIONS_MONTHS.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => onChange({ ...value, contractDurationMonths: months })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                value.contractDurationMonths === months
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
              }`}
            >
              {months} months
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Food preparation day
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Choose which day meals are prepared for your establishment each week.
        </p>
        <select
          value={value.preparationDayOfWeek}
          onChange={(e) =>
            onChange({ ...value, preparationDayOfWeek: Number(e.target.value) })
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          {PREPARATION_DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Meal periods
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Select when food should be prepared (breakfast, lunch, and/or dinner).
        </p>
        <div className="flex flex-wrap gap-2">
          {MEAL_CATEGORIES.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => toggleMealPeriod(meal)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                value.mealPeriods.includes(meal)
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
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Fulfillment
        </label>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-200">
            <input
              type="radio"
              name="fulfillment"
              checked={value.fulfillmentMethod === 'pickup'}
              onChange={() => onChange({ ...value, fulfillmentMethod: 'pickup' })}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-slate-900">Pickup</p>
              <p className="text-sm text-slate-500">Pick up food from the vendor — included</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-200">
            <input
              type="radio"
              name="fulfillment"
              checked={value.fulfillmentMethod === 'delivery'}
              onChange={() => onChange({ ...value, fulfillmentMethod: 'delivery' })}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-slate-900">Delivery</p>
              <p className="text-sm text-slate-500">
                Delivered to your facility — +${(DELIVERY_FEE_CENTS / 100).toFixed(2)} per order
              </p>
            </div>
          </label>
        </div>
      </div>
    </Card>
  );
};

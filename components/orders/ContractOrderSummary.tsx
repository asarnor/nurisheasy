'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  formatContractDate,
  formatContractDuration,
  formatFulfillmentMethod,
  getDaysUntilContractEnd,
  getPreparationDayLabel,
  PREPARATION_DAYS,
  type ContractDurationMonths,
  type FulfillmentMethod,
} from '@/lib/contract-options';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';

export interface ContractOrderSummaryData {
  consumerName: string;
  contractDurationMonths?: ContractDurationMonths;
  preparationDayOfWeek?: number;
  mealPeriods?: MealCategory[];
  fulfillmentMethod?: FulfillmentMethod;
  deliveryFeeCents?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

interface ContractOrderSummaryProps {
  order: ContractOrderSummaryData;
}

export const ContractOrderSummary: React.FC<ContractOrderSummaryProps> = ({ order }) => {
  const duration = order.contractDurationMonths ?? 3;
  const preparationDay = order.preparationDayOfWeek ?? 1;
  const mealPeriods = order.mealPeriods?.length ? order.mealPeriods : (['dinner'] as MealCategory[]);
  const fulfillment = order.fulfillmentMethod ?? 'pickup';
  const daysRemaining = getDaysUntilContractEnd(order.contractEndDate);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contractual order details</h2>
          <p className="text-sm text-slate-500">
            Food service agreement for this establishment
          </p>
        </div>
        <Badge variant="info">{formatContractDuration(duration)}</Badge>
      </div>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer / facility
          </dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">{order.consumerName}</dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Contract length</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatContractDuration(duration)}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Fulfillment</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatFulfillmentMethod(fulfillment)}
            {order.deliveryFeeCents
              ? ` · $${(order.deliveryFeeCents / 100).toFixed(2)} delivery fee`
              : ''}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Contract starts</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatContractDate(order.contractStartDate)}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">Contract ends</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatContractDate(order.contractEndDate)}
            {daysRemaining !== null && daysRemaining >= 0 && (
              <span className="ml-2 text-sm font-normal text-emerald-700">
                ({daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining)
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Weekly {fulfillment === 'delivery' ? 'delivery' : 'preparation'} day
        </p>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {PREPARATION_DAYS.map((day) => {
            const isActive = day.value === preparationDay;
            return (
              <div
                key={day.value}
                className={`rounded-lg px-1 py-2 text-center text-xs font-semibold sm:text-sm ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.label.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Meals are prepared for {order.consumerName} every{' '}
          <span className="font-medium text-slate-700">
            {getPreparationDayLabel(preparationDay)}
          </span>
          {fulfillment === 'delivery' ? ', then delivered to the facility' : ', for pickup'}.
        </p>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Meals included in contract</p>
        <div className="flex flex-wrap gap-2">
          {MEAL_CATEGORIES.map((meal) => {
            const included = mealPeriods.includes(meal);
            return (
              <span
                key={meal}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  included
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {included ? '✓' : '—'} {MEAL_CATEGORY_LABELS[meal]}
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MealPeriodFilter, type MealPeriodView } from '@/components/consumer/MealPeriodFilter';
import {
  CONTRACT_DURATIONS_MONTHS,
  PREPARATION_DAYS,
} from '@/lib/contract-options';
import {
  MARKETPLACE_DIETARY_FILTERS,
  type MarketplaceDietaryFilterId,
} from '@/lib/marketplace-vendors';
import { VENDOR_CERTIFICATIONS } from '@/lib/vendor-settings';
import type { FulfillmentMethod } from '@/lib/contract-options';

export interface VendorMarketplaceFilterState {
  q: string;
  meal: MealPeriodView;
  dietary: MarketplaceDietaryFilterId[];
  certification: string[];
  preparationDay: string;
  contractMonths: string;
  fulfillment: '' | FulfillmentMethod;
  acceptingContractsOnly: boolean;
}

export const DEFAULT_VENDOR_MARKETPLACE_FILTERS: VendorMarketplaceFilterState = {
  q: '',
  meal: 'dinner',
  dietary: [],
  certification: [],
  preparationDay: '',
  contractMonths: '',
  fulfillment: '',
  acceptingContractsOnly: false,
};

interface VendorMarketplaceFiltersProps {
  value: VendorMarketplaceFilterState;
  onChange: (value: VendorMarketplaceFilterState) => void;
  resultCount: number;
  onClear: () => void;
}

const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

export const buildVendorFilterQuery = (filters: VendorMarketplaceFilterState) => {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.meal !== 'all') params.set('meal', filters.meal);
  if (filters.dietary.length) params.set('dietary', filters.dietary.join(','));
  if (filters.certification.length) {
    params.set('certification', filters.certification.join(','));
  }
  if (filters.preparationDay !== '') {
    params.set('preparationDay', filters.preparationDay);
  }
  if (filters.contractMonths !== '') {
    params.set('contractMonths', filters.contractMonths);
  }
  if (filters.fulfillment) params.set('fulfillment', filters.fulfillment);
  if (filters.acceptingContractsOnly) params.set('acceptingContractsOnly', '1');

  return params.toString();
};

export const VendorMarketplaceFilters: React.FC<VendorMarketplaceFiltersProps> = ({
  value,
  onChange,
  resultCount,
  onClear,
}) => {
  const activeFilterCount =
    Number(Boolean(value.q.trim())) +
    Number(value.meal !== 'all') +
    value.dietary.length +
    value.certification.length +
    Number(value.preparationDay !== '') +
    Number(value.contractMonths !== '') +
    Number(Boolean(value.fulfillment)) +
    Number(value.acceptingContractsOnly);

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Find a vendor</h2>
          <p className="text-sm text-slate-500">
            {resultCount} published vendor{resultCount === 1 ? '' : 's'} match your filters
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      <Input
        label="Search vendors or menu keywords"
        placeholder="e.g. halal, organic, grilled chicken"
        value={value.q}
        onChange={(event) => onChange({ ...value, q: event.target.value })}
      />

      <MealPeriodFilter
        label="Meal period served"
        value={value.meal}
        onChange={(meal) => onChange({ ...value, meal })}
        showAll
      />

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">Dietary needs</p>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_DIETARY_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  dietary: toggleValue(value.dietary, option.id),
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                value.dietary.includes(option.id)
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">Kitchen certifications</p>
        <div className="flex flex-wrap gap-2">
          {VENDOR_CERTIFICATIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  certification: toggleValue(value.certification, option.id),
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                value.certification.includes(option.id)
                  ? 'bg-sky-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-sky-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Preparation day"
          value={value.preparationDay}
          onChange={(event) =>
            onChange({ ...value, preparationDay: event.target.value })
          }
          options={[
            { value: '', label: 'Any prep day' },
            ...PREPARATION_DAYS.map((day) => ({
              value: String(day.value),
              label: day.label,
            })),
          ]}
        />

        <Select
          label="Contract length"
          value={value.contractMonths}
          onChange={(event) =>
            onChange({ ...value, contractMonths: event.target.value })
          }
          options={[
            { value: '', label: 'Any contract length' },
            ...CONTRACT_DURATIONS_MONTHS.map((months) => ({
              value: String(months),
              label: `${months} months`,
            })),
          ]}
        />

        <Select
          label="Fulfillment"
          value={value.fulfillment}
          onChange={(event) =>
            onChange({
              ...value,
              fulfillment: event.target.value as '' | FulfillmentMethod,
            })
          }
          options={[
            { value: '', label: 'Pickup or delivery' },
            { value: 'pickup', label: 'Pickup only' },
            { value: 'delivery', label: 'Delivery only' },
          ]}
        />

        <div className="flex items-end">
          <label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.acceptingContractsOnly}
              onChange={(event) =>
                onChange({
                  ...value,
                  acceptingContractsOnly: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Accepting new contracts only
          </label>
        </div>
      </div>
    </div>
  );
};

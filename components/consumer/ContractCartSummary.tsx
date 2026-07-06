'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  buildContractLengthSummary,
  buildMealPeriodSummary,
  buildPreparationDaySummary,
  buildVendorSummary,
  formatCartLineSchedule,
  getCheckoutTotals,
  groupCartItemsForCheckout,
  type ConsumerCartItem,
} from '@/lib/consumer-cart';

type SummaryView = 'contract' | 'meal' | 'day' | 'vendor';

interface ContractCartSummaryProps {
  cart: ConsumerCartItem[];
}

const VIEW_OPTIONS: Array<{ id: SummaryView; label: string }> = [
  { id: 'contract', label: 'By contract length' },
  { id: 'meal', label: 'By meal period' },
  { id: 'day', label: 'By prep day' },
  { id: 'vendor', label: 'By vendor' },
];

export const ContractCartSummary: React.FC<ContractCartSummaryProps> = ({ cart }) => {
  const [view, setView] = useState<SummaryView>('contract');

  const groups = useMemo(() => {
    switch (view) {
      case 'meal':
        return buildMealPeriodSummary(cart);
      case 'day':
        return buildPreparationDaySummary(cart);
      case 'vendor':
        return buildVendorSummary(cart);
      case 'contract':
      default:
        return buildContractLengthSummary(cart);
    }
  }, [cart, view]);

  const checkoutGroups = useMemo(() => groupCartItemsForCheckout(cart), [cart]);
  const totals = useMemo(() => getCheckoutTotals(checkoutGroups), [checkoutGroups]);

  if (!cart.length) return null;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contract order summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review dishes grouped by schedule before checkout.
          </p>
        </div>
        <Badge variant="info">
          {checkoutGroups.length} contractual order
          {checkoutGroups.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setView(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === option.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{group.label}</h3>
              <span className="text-sm text-slate-500">
                {group.itemCount} dish{group.itemCount === 1 ? '' : 'es'} · $
                {(group.subtotalCents / 100).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              {group.sections.map((section) => (
                <div key={section.id} className="rounded-xl bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{section.title}</p>
                      <p className="text-sm text-slate-500">{section.subtitle}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      ${(section.subtotalCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li
                        key={item.lineId}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatCartLineSchedule(item)}
                          </p>
                        </div>
                        <span className="font-semibold text-slate-700">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Food subtotal
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            ${(totals.subtotalCents / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Delivery fees
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            ${(totals.deliveryFeeCents / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Estimated total
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-900">
            ${(totals.totalCents / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </Card>
  );
};

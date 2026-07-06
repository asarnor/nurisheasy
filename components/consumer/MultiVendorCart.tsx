'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  formatCartLineSchedule,
  getCartSubtotalCents,
  type ConsumerCartItem,
} from '@/lib/consumer-cart';

interface MultiVendorCartProps {
  items: ConsumerCartItem[];
  onCheckout: () => void;
  onRemoveItem?: (lineId: string) => void;
}

export const MultiVendorCart: React.FC<MultiVendorCartProps> = ({
  items,
  onCheckout,
  onRemoveItem,
}) => {
  const itemsByVendor = items.reduce(
    (acc, item) => {
      if (!acc[item.vendorId]) {
        acc[item.vendorId] = {
          vendorName: item.vendorName,
          items: [],
        };
      }
      acc[item.vendorId].items.push(item);
      return acc;
    },
    {} as Record<string, { vendorName: string; items: ConsumerCartItem[] }>
  );

  const totalPrice = getCartSubtotalCents(items);
  const dishCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Contract cart</h2>
        <span className="text-xs font-semibold text-slate-500">
          {dishCount} dish{dishCount !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto">
        {Object.entries(itemsByVendor).map(([vendorId, vendorData]) => (
          <div key={vendorId} className="border-b border-slate-200 pb-4 last:border-b-0">
            <h3 className="mb-2 font-semibold text-slate-700">{vendorData.vendorName}</h3>
            <div className="space-y-3">
              {vendorData.items.map((item) => (
                <div key={item.lineId} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatCartLineSchedule(item)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                      {onRemoveItem && (
                        <button
                          onClick={() => onRemoveItem(item.lineId)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-700">Food subtotal</span>
          <span className="text-2xl font-semibold text-slate-900">
            ${(totalPrice / 100).toFixed(2)}
          </span>
        </div>
        <Button
          onClick={onCheckout}
          className="w-full"
          size="lg"
          disabled={items.length === 0}
        >
          Review contract summary
        </Button>
      </div>
    </Card>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MenuItemOrderOptions,
  buildMenuItemOrderDefaults,
  type MenuItemOrderOptionsValue,
} from '@/components/consumer/MenuItemOrderOptions';
import { normalizePreparationDays } from '@/lib/consumer-cart';
import type { ContractDurationMonths } from '@/lib/contract-options';
import type { MealCategory } from '@/lib/meal-categories';
import type { OrderContractOptions } from '@/lib/contract-options';

interface MenuItemCardProps {
  id: string;
  name: string;
  price: number;
  rating?: number;
  imageUrl?: string;
  vendorName: string;
  allergenTags: string[];
  defaultMealPeriod?: MealCategory;
  defaultContractOptions?: Partial<OrderContractOptions>;
  offeredContractDurations?: ContractDurationMonths[];
  preparationDays?: number[];
  mealPeriods?: MealCategory[];
  offersPickup?: boolean;
  offersDelivery?: boolean;
  onAddConfiguredItem: (
    item: MenuItemOrderOptionsValue & { menuItemId: string }
  ) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  id,
  name,
  price,
  rating = 0,
  imageUrl,
  vendorName,
  allergenTags,
  defaultMealPeriod,
  defaultContractOptions,
  offeredContractDurations,
  preparationDays,
  mealPeriods,
  offersPickup,
  offersDelivery,
  onAddConfiguredItem,
}) => {
  const [orderOptions, setOrderOptions] = useState<MenuItemOrderOptionsValue>(() =>
    buildMenuItemOrderDefaults(defaultContractOptions, defaultMealPeriod, preparationDays)
  );

  useEffect(() => {
    setOrderOptions(
      buildMenuItemOrderDefaults(defaultContractOptions, defaultMealPeriod, preparationDays)
    );
  }, [defaultContractOptions, defaultMealPeriod, preparationDays, id]);

  useEffect(() => {
    setOrderOptions((current) => {
      let next = current;
      if (
        offeredContractDurations?.length &&
        !offeredContractDurations.includes(current.contractDurationMonths)
      ) {
        next = { ...next, contractDurationMonths: offeredContractDurations[0] };
      }
      if (preparationDays?.length) {
        const filteredDays = normalizePreparationDays(
          current.preparationDays.filter((day) => preparationDays.includes(day))
        );
        next = {
          ...next,
          preparationDays: filteredDays.length ? filteredDays : [preparationDays[0]],
        };
      }
      if (mealPeriods?.length && !mealPeriods.includes(current.mealPeriod)) {
        next = { ...next, mealPeriod: mealPeriods[0] };
      }
      if (!offersDelivery && next.fulfillmentMethod === 'delivery') {
        next = { ...next, fulfillmentMethod: 'pickup' };
      }
      if (!offersPickup && next.fulfillmentMethod === 'pickup') {
        next = { ...next, fulfillmentMethod: 'delivery' };
      }
      return next;
    });
  }, [
    offeredContractDurations,
    preparationDays,
    mealPeriods,
    offersPickup,
    offersDelivery,
    id,
  ]);

  const formattedPrice = (price / 100).toFixed(2);

  const handleAdd = () => {
    onAddConfiguredItem({
      ...orderOptions,
      preparationDays: normalizePreparationDays(orderOptions.preparationDays),
      menuItemId: id,
    });
    setOrderOptions((current) => ({
      ...buildMenuItemOrderDefaults(defaultContractOptions, defaultMealPeriod, preparationDays),
      quantity: 1,
      contractDurationMonths: current.contractDurationMonths,
      preparationDays: current.preparationDays,
      mealPeriod: current.mealPeriod,
      fulfillmentMethod: current.fulfillmentMethod,
    }));
  };

  return (
    <Card className="overflow-hidden group animate-fade-up">
      <div className="relative h-44 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Freshly prepared
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="success" className="bg-emerald-50">
            Safety Match
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="font-semibold text-lg text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500">{vendorName}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold text-slate-900">${formattedPrice}</span>
          {rating > 0 && (
            <div className="flex items-center text-sm text-slate-500">⭐ {rating}</div>
          )}
        </div>

        {allergenTags.length > 0 && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Contains: {allergenTags.join(', ')}
          </div>
        )}

        <MenuItemOrderOptions
          value={orderOptions}
          onChange={setOrderOptions}
          inputNamePrefix={`menu-item-${id}`}
          offeredContractDurations={offeredContractDurations}
          preparationDays={preparationDays}
          mealPeriods={mealPeriods}
          offersPickup={offersPickup}
          offersDelivery={offersDelivery}
          compact
        />

        <Button
          onClick={handleAdd}
          className="w-full"
          size="sm"
          disabled={orderOptions.preparationDays.length === 0}
        >
          Add {orderOptions.quantity} to cart
        </Button>
      </div>
    </Card>
  );
};

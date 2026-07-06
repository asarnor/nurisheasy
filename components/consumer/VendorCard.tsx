'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  formatContractDurations,
  formatPreparationDays,
  type MarketplaceVendorListing,
} from '@/lib/marketplace-vendors';
import {
  VENDOR_CERTIFICATIONS,
  formatCentsAsDollars,
} from '@/lib/vendor-settings';
import { MEAL_CATEGORY_LABELS } from '@/lib/meal-categories';

interface VendorCardProps {
  vendor: MarketplaceVendorListing;
  selected: boolean;
  onSelect: (vendorId: string) => void;
}

const certificationLabel = (id: string) =>
  VENDOR_CERTIFICATIONS.find((entry) => entry.id === id)?.label || id;

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  selected,
  onSelect,
}) => {
  return (
    <Card
      onClick={() => onSelect(vendor.id)}
      className={`h-full transition-all ${
        selected
          ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40'
          : 'hover:border-emerald-200'
      }`}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{vendor.name}</h3>
            {vendor.address && (
              <p className="mt-1 text-sm text-slate-500">
                {vendor.address.city}, {vendor.address.state}
              </p>
            )}
          </div>
          {selected && <Badge variant="success">Selected</Badge>}
        </div>

        {vendor.description && (
          <p className="line-clamp-3 text-sm text-slate-600">{vendor.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {vendor.certifications.slice(0, 3).map((cert) => (
            <Badge key={cert} variant="info">
              {certificationLabel(cert)}
            </Badge>
          ))}
          {!vendor.acceptingNewContracts && (
            <Badge variant="warning">Waitlist only</Badge>
          )}
        </div>

        <div className="mt-auto grid gap-2 text-xs text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span>Menu items</span>
            <span className="font-semibold text-slate-800">{vendor.menuItemCount}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Prep days</span>
            <span className="font-semibold text-slate-800">
              {formatPreparationDays(vendor.preparationDays)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Contracts</span>
            <span className="font-semibold text-slate-800">
              {formatContractDurations(vendor.offeredContractDurations)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Meals</span>
            <span className="font-semibold text-slate-800">
              {vendor.mealPeriods.map((meal) => MEAL_CATEGORY_LABELS[meal]).join(', ')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Fulfillment</span>
            <span className="font-semibold text-slate-800">
              {[vendor.offersPickup && 'Pickup', vendor.offersDelivery && 'Delivery']
                .filter(Boolean)
                .join(' · ') || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Minimum order</span>
            <span className="font-semibold text-slate-800">
              {formatCentsAsDollars(vendor.minimumOrderCents)}
            </span>
          </div>
          {vendor.averageRating !== null && (
            <div className="flex items-center justify-between gap-2">
              <span>Rating</span>
              <span className="font-semibold text-slate-800">
                ⭐ {vendor.averageRating.toFixed(1)} ({vendor.reviewCount})
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

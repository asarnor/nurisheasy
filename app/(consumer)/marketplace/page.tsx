'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MenuItemCard } from '@/components/consumer/MenuItemCard';
import { MultiVendorCart } from '@/components/consumer/MultiVendorCart';
import { VendorCard } from '@/components/consumer/VendorCard';
import {
  VendorMarketplaceFilters,
  DEFAULT_VENDOR_MARKETPLACE_FILTERS,
  buildVendorFilterQuery,
  type VendorMarketplaceFilterState,
} from '@/components/consumer/VendorMarketplaceFilters';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import {
  mergeCartLine,
  parseStoredCart,
  type ConsumerCartItem,
} from '@/lib/consumer-cart';
import { DEFAULT_CONTRACT_OPTIONS, type OrderContractOptions } from '@/lib/contract-options';
import type { MealCategory } from '@/lib/meal-categories';
import type { MarketplaceVendorListing } from '@/lib/marketplace-vendors';
import type { MenuItemOrderOptionsValue } from '@/components/consumer/MenuItemOrderOptions';

interface MenuItem {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  price: number;
  allergenTags: string[];
  ingredients: string[];
  imageUrl?: string;
  displayImageUrl?: string;
  mealCategories?: MealCategory[];
  category?: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [vendorFilters, setVendorFilters] = useState<VendorMarketplaceFilterState>(
    DEFAULT_VENDOR_MARKETPLACE_FILTERS
  );
  const [vendors, setVendors] = useState<MarketplaceVendorListing[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<ConsumerCartItem[]>([]);
  const [defaultContractOptions, setDefaultContractOptions] = useState<OrderContractOptions>(
    DEFAULT_CONTRACT_OPTIONS
  );
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) || null,
    [vendors, selectedVendorId]
  );

  useEffect(() => {
    setCart(parseStoredCart(localStorage.getItem('cart')));

    const savedDefaults = localStorage.getItem('defaultContractOptions');
    if (savedDefaults) {
      try {
        setDefaultContractOptions(JSON.parse(savedDefaults));
      } catch {
        // ignore invalid saved defaults
      }
    } else {
      apiFetch('/api/consumer/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.settings?.defaultContractOptions) {
            setDefaultContractOptions(data.settings.defaultContractOptions);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchVendors();
  }, [vendorFilters]);

  useEffect(() => {
    if (!selectedVendorId) {
      setMenuItems([]);
      return;
    }
    fetchMenuItems(selectedVendorId);
  }, [selectedVendorId, vendorFilters.meal]);

  useEffect(() => {
    if (!vendors.length) {
      setSelectedVendorId(null);
      return;
    }

    if (!selectedVendorId || !vendors.some((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const query = buildVendorFilterQuery(vendorFilters);
      const response = await apiFetch(`/api/vendors${query ? `?${query}` : ''}`);
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchMenuItems = async (vendorId: string) => {
    try {
      setLoadingMenu(true);
      const mealQuery =
        vendorFilters.meal !== 'all' ? `&meal=${vendorFilters.meal}` : '';
      const response = await apiFetch(
        `/api/menus?vendorId=${vendorId}${mealQuery}`
      );
      const data = await response.json();
      setMenuItems(data.items || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleAddConfiguredItem = (
    menuItem: MenuItem,
    options: MenuItemOrderOptionsValue & { menuItemId: string }
  ) => {
    setCart((prev) =>
      mergeCartLine(prev, {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: options.quantity,
        price: menuItem.price,
        vendorId: menuItem.vendorId,
        vendorName: menuItem.vendorName,
        contractDurationMonths: options.contractDurationMonths,
        preparationDays: options.preparationDays,
        mealPeriod: options.mealPeriod,
        fulfillmentMethod: options.fulfillmentMethod,
      })
    );
  };

  const handleRemoveFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const handleCheckout = () => {
    router.push(consumerPath('/cart'));
  };

  const defaultMealPeriod =
    vendorFilters.meal !== 'all' ? vendorFilters.meal : undefined;

  return (
    <ConsumerShell
      active="marketplace"
      title="Marketplace"
      subtitle="Choose a published vendor, then browse their menu with your safety filters applied."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-3">
          <VendorMarketplaceFilters
            value={vendorFilters}
            onChange={setVendorFilters}
            resultCount={vendors.length}
            onClear={() => setVendorFilters(DEFAULT_VENDOR_MARKETPLACE_FILTERS)}
          />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Published vendors</h2>
                <p className="text-sm text-slate-500">
                  Select a vendor to view their menu and add items to your cart.
                </p>
              </div>
            </div>

            {loadingVendors ? (
              <Card className="py-10 text-center text-slate-500">
                Loading published vendors...
              </Card>
            ) : vendors.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="font-medium text-slate-800">No vendors match these filters</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try clearing dietary or preparation filters, or search with broader keywords.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setVendorFilters(DEFAULT_VENDOR_MARKETPLACE_FILTERS)}
                >
                  Reset filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    selected={vendor.id === selectedVendorId}
                    onSelect={setSelectedVendorId}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {selectedVendor ? `${selectedVendor.name} menu` : 'Vendor menu'}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedVendor
                  ? 'Configure contract length, prep day, and meal period for each dish before adding to cart.'
                  : 'Select a vendor above to browse their menu.'}
              </p>
            </div>

            {!selectedVendor ? (
              <Card className="py-10 text-center text-slate-500">
                Choose a published vendor to see available menu items.
              </Card>
            ) : loadingMenu ? (
              <Card className="py-10 text-center text-slate-500">
                Loading menu items...
              </Card>
            ) : menuItems.length === 0 ? (
              <Card className="py-10 text-center text-slate-500">
                No menu items available for this vendor
                {vendorFilters.meal !== 'all' ? ` during ${vendorFilters.meal}` : ''}.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {menuItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    price={item.price}
                    rating={4.5}
                    imageUrl={item.displayImageUrl || item.imageUrl}
                    vendorName={item.vendorName}
                    allergenTags={item.allergenTags}
                    defaultMealPeriod={defaultMealPeriod}
                    defaultContractOptions={defaultContractOptions}
                    offeredContractDurations={selectedVendor.offeredContractDurations}
                    preparationDays={selectedVendor.preparationDays}
                    mealPeriods={selectedVendor.mealPeriods}
                    offersPickup={selectedVendor.offersPickup}
                    offersDelivery={selectedVendor.offersDelivery}
                    onAddConfiguredItem={(options) =>
                      handleAddConfiguredItem(item, options)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <MultiVendorCart
              items={cart}
              onCheckout={handleCheckout}
              onRemoveItem={handleRemoveFromCart}
            />
          </div>
        </div>
      </div>
    </ConsumerShell>
  );
}

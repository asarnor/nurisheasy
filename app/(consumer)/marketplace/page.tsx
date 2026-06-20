'use client';

import React, { useState, useEffect } from 'react';
import { MenuItemCard } from '@/components/consumer/MenuItemCard';
import { MultiVendorCart } from '@/components/consumer/MultiVendorCart';
import { DietaryFilter } from '@/components/consumer/DietaryFilter';
import { MealPeriodFilter } from '@/components/consumer/MealPeriodFilter';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import type { MealCategory } from '@/lib/meal-categories';

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

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorName: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === '1';
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [mealPeriod, setMealPeriod] = useState<MealCategory>('dinner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, [filter, mealPeriod]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/menus?meal=${mealPeriod}`);
      const data = await response.json();
      setMenuItems(data.items || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      const menuItem = menuItems.find((item) => item.id === id);

      if (quantity <= 0) {
        return prev.filter((item) => item.id !== id);
      }

      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        );
      }

      if (!menuItem) {
        return prev;
      }

      return [
        ...prev,
        {
          id: menuItem.id,
          name: menuItem.name,
          quantity,
          price: menuItem.price,
          vendorId: menuItem.vendorId,
          vendorName: menuItem.vendorName,
        },
      ];
    });
  };

  const handleAddToCart = (id: string) => {
    const menuItem = menuItems.find((item) => item.id === id);
    if (!menuItem) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
          vendorId: menuItem.vendorId,
          vendorName: menuItem.vendorName,
        },
      ];
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    router.push(consumerPath('/cart'));
  };

  const getCartItemQuantity = (id: string) => {
    const item = cart.find((item) => item.id === id);
    return item?.quantity || 0;
  };

  const activeFilters = filter !== 'all' ? [filter] : [];

  return (
    <ConsumerShell
      active="marketplace"
      title="Marketplace"
      subtitle="Browse vendor menus curated for your dietary requirements."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {showWelcome && (
            <Card className="border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">
                    You&apos;re ready to order
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    Browse menus below — items with your critical allergens are already hidden.
                    Add items to your cart, then check out with your contract schedule.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => router.replace(consumerPath('/marketplace'))}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          )}
          <MealPeriodFilter value={mealPeriod} onChange={setMealPeriod} />

          <DietaryFilter
            value={filter}
            onChange={setFilter}
            activeFilters={activeFilters}
          />

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading menu items...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No menu items available for this meal period</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  quantity={getCartItemQuantity(item.id)}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
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

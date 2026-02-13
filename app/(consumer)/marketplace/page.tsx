'use client';

import React, { useState, useEffect } from 'react';
import { MenuItemCard } from '@/components/consumer/MenuItemCard';
import { MultiVendorCart } from '@/components/consumer/MultiVendorCart';
import { DietaryFilter } from '@/components/consumer/DietaryFilter';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils/api';

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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, [filter]);

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
      const response = await apiFetch('/api/menus');
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
    router.push('/cart');
  };

  const getCartItemQuantity = (id: string) => {
    const item = cart.find((item) => item.id === id);
    return item?.quantity || 0;
  };

  const activeFilters = filter !== 'all' ? [filter] : [];

  return (
    <div className="min-h-screen app-surface">
      {/* Header */}
      <Header title="SafePlate - Marketplace" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">Marketplace</h1>
          <p className="text-sm text-slate-500">
            Browse vendor menus curated for your dietary requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
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
                <p className="text-slate-500">No menu items available</p>
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
                    imageUrl={item.imageUrl}
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

          {/* Cart Sidebar */}
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
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/marketplace')}
            className="flex flex-col items-center p-2 text-emerald-600"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">👤</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

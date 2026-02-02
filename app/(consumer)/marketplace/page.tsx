'use client';

import React, { useState, useEffect } from 'react';
import { MenuItemCard } from '@/components/consumer/MenuItemCard';
import { MultiVendorCart } from '@/components/consumer/MultiVendorCart';
import { DietaryFilter } from '@/components/consumer/DietaryFilter';
import { useRouter } from 'next/navigation';

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

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/menus');
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
      if (existing) {
        if (quantity === 0) {
          return prev.filter((item) => item.id !== id);
        }
        return prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        );
      }
      return prev;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">SafePlate</h1>
              <span className="text-gray-500">Marketplace</span>
            </div>
            <div className="hidden md:block">
              <span className="text-sm text-gray-600">
                Multi-Vendor Cart ({cart.length} items)
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <DietaryFilter
              value={filter}
              onChange={setFilter}
              activeFilters={activeFilters}
            />

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading menu items...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No menu items available</p>
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
            <div className="sticky top-4">
              <MultiVendorCart
                items={cart}
                onCheckout={handleCheckout}
                onRemoveItem={handleRemoveFromCart}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { VendorShell } from '@/components/layout/VendorShell';
import { MenuItemPhoto } from '@/components/vendor/MenuItemPhoto';
import { apiFetch } from '@/lib/utils/api';

interface MenuItem {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  ingredients?: string[];
  imageUrl?: string;
  isAvailable: boolean;
}

export default function QuickEditPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiFetch('/api/menus?vendorId=current');
      if (response.ok) {
        const data = await response.json();
        const normalized = (data.items || []).map((item: MenuItem) => ({
          ...item,
          _id: item._id || item.id || '',
        }));
        setMenuItems(normalized);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await apiFetch(`/api/menus/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (response.ok) {
        setMenuItems((prev) =>
          prev.map((item) =>
            item._id === itemId
              ? { ...item, isAvailable: !currentStatus }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  return (
    <VendorShell
      active="quick-edit"
      title="Stock Toggle"
      subtitle="Quickly mark menu items in or out of stock."
    >
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading menu items...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Card key={item._id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  <MenuItemPhoto
                    item={item}
                    aspect="square"
                    className="h-20 w-20 shrink-0"
                    showBadge={false}
                  />
                  <div className="min-w-0 flex-1">
                    <Toggle
                      label={item.name}
                      checked={item.isAvailable}
                      onChange={() => handleToggle(item._id, item.isAvailable)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {item.isAvailable ? 'In stock' : 'Out of stock'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </VendorShell>
  );
}

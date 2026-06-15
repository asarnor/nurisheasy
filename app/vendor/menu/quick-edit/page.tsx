'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { apiFetch } from '@/lib/utils/api';

interface MenuItem {
  _id: string;
  id?: string;
  name: string;
  isAvailable: boolean;
}

export default function QuickEditPage() {
  const router = useRouter();
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
    <div className="min-h-screen app-surface">
      {/* Mobile Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200/70">
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold">Out of Stock</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 app-grid animate-fade-up">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading menu items...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Card key={item._id}>
                <Toggle
                  label={item.name}
                  checked={item.isAvailable}
                  onChange={() => handleToggle(item._id, item.isAvailable)}
                />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

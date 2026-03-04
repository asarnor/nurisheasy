'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/layout/Header';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { apiFetch } from '@/lib/utils/api';

interface MenuItem {
  _id: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  allergenTags: string[];
  ingredients: string[];
}

export default function MenuEditorPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    allergenTags: [] as string[],
    ingredients: '',
    isAvailable: true,
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      // Fetch vendor's menu items
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

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: (item.price / 100).toFixed(2),
      allergenTags: item.allergenTags,
      ingredients: item.ingredients.join(', '),
      isAvailable: item.isAvailable,
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        price: Math.round(parseFloat(formData.price) * 100),
        ingredients: formData.ingredients
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean),
      };

      const editingItemId = editingItem?._id;
      const isEditing = Boolean(editingItemId);
      const url = isEditing ? `/api/menus/${editingItemId}` : '/api/menus';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setEditingItem(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          allergenTags: [],
          ingredients: '',
          isAvailable: true,
        });
        fetchMenuItems();
      } else {
        alert('Failed to save menu item');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await apiFetch(`/api/menus/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (response.ok) {
        fetchMenuItems();
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const allergenOptions = [
    'PEANUT',
    'TREE_NUT',
    'SHELLFISH',
    'FISH',
    'EGG',
    'DAIRY',
    'SOY',
    'WHEAT',
    'GLUTEN',
    'SESAME',
  ];

  return (
    <div className="min-h-screen app-surface">
      <MobileHeader title="Menu Editor" showBack onBack={() => router.back()} />
      <div className="hidden md:block">
        <Header title="Menu Editor" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Menu Editor</h1>
            <p className="text-sm text-slate-500">Manage availability and update dietary tags.</p>
          </div>
          <Button onClick={() => setEditingItem({} as MenuItem)}>
            Add Menu Item
          </Button>
        </div>

        {editingItem !== null && (
          <Card className="mb-6 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem._id ? 'Edit Menu Item' : 'New Menu Item'}
            </h2>
            
            <div className="space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Example: works great with rice"
              />
              
              <Input
                label="Price ($)"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Allergens
                </label>
                <div className="flex flex-wrap gap-2">
                  {allergenOptions.map((allergen) => (
                    <button
                      key={allergen}
                      onClick={() => {
                        const newTags = formData.allergenTags.includes(allergen)
                          ? formData.allergenTags.filter((t) => t !== allergen)
                          : [...formData.allergenTags, allergen];
                        setFormData({ ...formData, allergenTags: newTags });
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.allergenTags.includes(allergen)
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {allergen.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              <Input
                label="Ingredients (comma-separated)"
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                placeholder="pasta, cream, chicken"
              />
              
              <Toggle
                label="Availability"
                checked={formData.isAvailable}
                onChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
              />
              
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save
                </Button>
                <Button
                  onClick={() => setEditingItem(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading menu items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Card key={item._id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-slate-900">{item.name}</h3>
                  <Toggle
                    label=""
                    checked={item.isAvailable}
                    onChange={() => handleToggleAvailability(item._id, item.isAvailable)}
                  />
                </div>
                <p className="text-sm text-slate-500 mb-2">{item.description}</p>
                <p className="font-semibold mb-2 text-slate-900">${(item.price / 100).toFixed(2)}</p>
                {item.allergenTags.length > 0 && (
                  <p className="text-xs text-rose-600 mb-2">
                    Contains: {item.allergenTags.join(', ')}
                  </p>
                )}
                <Button
                  onClick={() => handleEdit(item)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/vendor/orders')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/vendor/menu')}
            className="flex flex-col items-center p-2 text-emerald-600"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs">Menu</span>
          </button>
          <button
            onClick={() => router.push('/vendor/settings')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

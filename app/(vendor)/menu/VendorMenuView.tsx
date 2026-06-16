'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { VendorShell } from '@/components/layout/VendorShell';
import { MealPeriodFilter, type MealPeriodView } from '@/components/consumer/MealPeriodFilter';
import { MenuItemPhoto } from '@/components/vendor/MenuItemPhoto';
import { isVendorUploadedImage } from '@/lib/menu-item-images';
import {
  DEFAULT_MEAL_CATEGORIES,
  formatMealCategories,
  itemMatchesMeal,
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';
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
  imageUrl?: string;
  displayImageUrl?: string;
  mealCategories?: MealCategory[];
  category?: string;
}

export default function MenuEditorPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuView, setMenuView] = useState<MealPeriodView>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    allergenTags: [] as string[],
    ingredients: '',
    mealCategories: [...DEFAULT_MEAL_CATEGORIES] as MealCategory[],
    isAvailable: true,
  });

  const resetForm = () => ({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    allergenTags: [] as string[],
    ingredients: '',
    mealCategories: [...DEFAULT_MEAL_CATEGORIES] as MealCategory[],
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
      imageUrl: isVendorUploadedImage(item.imageUrl) ? item.imageUrl || '' : '',
      allergenTags: item.allergenTags,
      ingredients: item.ingredients.join(', '),
      mealCategories: item.mealCategories?.length
        ? item.mealCategories
        : [...DEFAULT_MEAL_CATEGORIES],
      isAvailable: item.isAvailable,
    });
  };

  const toggleMealCategory = (meal: MealCategory) => {
    setFormData((prev) => {
      const selected = prev.mealCategories.includes(meal)
        ? prev.mealCategories.filter((entry) => entry !== meal)
        : [...prev.mealCategories, meal];

      return {
        ...prev,
        mealCategories: selected.length ? selected : [...DEFAULT_MEAL_CATEGORIES],
      };
    });
  };

  const openNewItemForm = () => {
    setEditingItem({} as MenuItem);
    setFormData(resetForm());
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        price: Math.round(parseFloat(formData.price) * 100),
        imageUrl: formData.imageUrl.trim() || undefined,
        mealCategories: formData.mealCategories,
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
        setFormData(resetForm());
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

  const getItemsForMeal = (meal: MealCategory) =>
    menuItems.filter((item) => itemMatchesMeal(item, meal));

  const visibleItems =
    menuView === 'all' ? menuItems : getItemsForMeal(menuView);

  const renderMenuCard = (item: MenuItem) => (
    <Card key={item._id} className="overflow-hidden">
      <MenuItemPhoto item={item} />
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-slate-900">{item.name}</h3>
          <Toggle
            label=""
            checked={item.isAvailable}
            onChange={() => handleToggleAvailability(item._id, item.isAvailable)}
          />
        </div>
        <p className="text-sm text-slate-500 mb-2">{item.description}</p>
        {item.mealCategories?.length ? (
          <p className="text-xs font-medium text-emerald-700 mb-2">
            {formatMealCategories(item.mealCategories)}
          </p>
        ) : null}
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
      </div>
    </Card>
  );

  const renderMenuGrid = (items: MenuItem[]) => {
    if (items.length === 0) {
      return (
        <Card className="text-center py-10">
          <p className="text-slate-500">No items in this menu yet.</p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => renderMenuCard(item))}
      </div>
    );
  };

  return (
    <VendorShell
      active="menu"
      title="Menu Editor"
      subtitle="Manage items across your breakfast, lunch, and dinner menus."
      actions={
        <Button onClick={openNewItemForm}>
          Add Menu Item
        </Button>
      }
    >
      <div className="max-w-6xl mx-auto">

        {editingItem !== null && (
          <Card className="mb-6 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem._id ? 'Edit Menu Item' : 'New Menu Item'}
            </h2>
            
            <div className="space-y-4">
              <MenuItemPhoto
                item={{
                  _id: editingItem._id,
                  name: formData.name || 'New menu item',
                  description: formData.description,
                  ingredients: formData.ingredients
                    .split(',')
                    .map((i) => i.trim())
                    .filter(Boolean),
                  imageUrl: formData.imageUrl || undefined,
                }}
              />
              <p className="text-xs text-slate-500">
                Leave photo URL empty to auto-generate an image from the item name and description.
              </p>

              <Input
                label="Photo URL (optional)"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/your-dish.jpg"
              />

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
                  Meal periods
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Select one or more. New items default to dinner.
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_CATEGORIES.map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => toggleMealCategory(meal)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.mealCategories.includes(meal)
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {MEAL_CATEGORY_LABELS[meal]}
                    </button>
                  ))}
                </div>
              </div>

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

        <MealPeriodFilter
          value={menuView}
          onChange={setMenuView}
          showAll
          label="View menu"
        />

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading menu items...</p>
          </div>
        ) : menuView === 'all' ? (
          <div className="space-y-10">
            {MEAL_CATEGORIES.map((meal) => {
              const items = getItemsForMeal(meal);

              return (
                <section key={meal}>
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        {MEAL_CATEGORY_LABELS[meal]} Menu
                      </h2>
                      <p className="text-sm text-slate-500">
                        {items.length} item{items.length === 1 ? '' : 's'} available for{' '}
                        {MEAL_CATEGORY_LABELS[meal].toLowerCase()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setMenuView(meal);
                      }}
                    >
                      View only {MEAL_CATEGORY_LABELS[meal].toLowerCase()}
                    </Button>
                  </div>
                  {renderMenuGrid(items)}
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                {MEAL_CATEGORY_LABELS[menuView]} Menu
              </h2>
              <p className="text-sm text-slate-500">
                {visibleItems.length} item{visibleItems.length === 1 ? '' : 's'} in this menu
              </p>
            </div>
            {renderMenuGrid(visibleItems)}
          </>
        )}
      </div>
    </VendorShell>
  );
}

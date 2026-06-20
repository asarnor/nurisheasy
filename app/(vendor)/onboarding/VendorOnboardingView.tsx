'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VendorShell } from '@/components/layout/VendorShell';
import { apiFetch } from '@/lib/utils/api';
import { vendorPath } from '@/lib/utils/debug-client';
import {
  CONTRACT_DURATIONS_MONTHS,
  PREPARATION_DAYS,
} from '@/lib/contract-options';
import { MEAL_CATEGORIES, MEAL_CATEGORY_LABELS, type MealCategory } from '@/lib/meal-categories';
import {
  MIN_ONBOARDING_MENU_ITEMS,
  type VendorOnboardingStatus,
  type VendorOnboardingStep,
} from '@/lib/vendor-onboarding';
import type { VendorSettings } from '@/lib/vendor-settings';

const ALLERGEN_OPTIONS = [
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

const MENU_TEMPLATES = [
  {
    name: 'Farm Fresh Scrambled Eggs & Toast',
    price: '7.99',
    mealCategories: ['breakfast'] as MealCategory[],
    allergenTags: ['EGG', 'WHEAT', 'DAIRY'],
  },
  {
    name: 'Grilled Chicken & Rice Bowl',
    price: '9.99',
    mealCategories: ['lunch'] as MealCategory[],
    allergenTags: ['SOY'],
  },
  {
    name: 'Herb Roasted Salmon Plate',
    price: '12.99',
    mealCategories: ['dinner'] as MealCategory[],
    allergenTags: ['FISH'],
  },
];

interface MenuDraft {
  name: string;
  price: string;
  mealCategories: MealCategory[];
  allergenTags: string[];
}

const emptyMenuDraft = (): MenuDraft => ({
  name: '',
  price: '',
  mealCategories: ['dinner'],
  allergenTags: [],
});

const STEPS: { id: VendorOnboardingStep; label: string; hint: string }[] = [
  { id: 'kitchen', label: 'Kitchen', hint: 'Where & when you serve' },
  { id: 'menu', label: 'Menu', hint: 'Your first items' },
  { id: 'launch', label: 'Go live', hint: 'Publish to group homes' },
];

export default function VendorOnboardingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step') as VendorOnboardingStep | null;

  const [activeStep, setActiveStep] = useState<VendorOnboardingStep>('kitchen');
  const [status, setStatus] = useState<VendorOnboardingStatus | null>(null);
  const [settings, setSettings] = useState<VendorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kitchenName, setKitchenName] = useState('My Kitchen');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(15);
  const [preparationDays, setPreparationDays] = useState<number[]>([1, 3, 5]);
  const [mealPeriods, setMealPeriods] = useState<MealCategory[]>(['breakfast', 'lunch', 'dinner']);

  const [menuDrafts, setMenuDrafts] = useState<MenuDraft[]>([
    emptyMenuDraft(),
    emptyMenuDraft(),
    emptyMenuDraft(),
  ]);

  useEffect(() => {
    if (stepParam && STEPS.some((step) => step.id === stepParam)) {
      setActiveStep(stepParam);
    }
  }, [stepParam]);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      setLoading(true);
      await apiFetch('/api/vendor/onboarding?action=bootstrap', { method: 'POST' });
      const response = await apiFetch('/api/vendor/onboarding');
      if (!response.ok) throw new Error('Failed to load onboarding');
      applyPayload(await response.json());
    } catch (err) {
      console.error(err);
      setError('Could not load onboarding. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const applyPayload = (data: {
    organization: {
      name: string;
      address?: typeof address;
      settings: VendorSettings;
    };
    status: VendorOnboardingStatus;
  }) => {
    setStatus(data.status);
    setSettings(data.organization.settings);
    setKitchenName(data.organization.name || 'My Kitchen');
    setContactName(data.organization.settings.contactName || '');
    setContactEmail(data.organization.settings.contactEmail || '');
    setContactPhone(data.organization.settings.contactPhone || '');
    if (data.organization.address) setAddress(data.organization.address);
    setOffersPickup(data.organization.settings.offersPickup);
    setOffersDelivery(data.organization.settings.offersDelivery);
    setDeliveryRadiusKm(data.organization.settings.deliveryRadiusKm);
    setPreparationDays(data.organization.settings.preparationDays);
    setMealPeriods(data.organization.settings.mealPeriods);

    if (data.status.isComplete) {
      router.replace(vendorPath('/vendor/kds'));
    }
  };

  const togglePrepDay = (day: number) => {
    setPreparationDays((current) =>
      current.includes(day)
        ? current.length > 1
          ? current.filter((entry) => entry !== day)
          : current
        : [...current, day].sort()
    );
  };

  const toggleMeal = (meal: MealCategory) => {
    setMealPeriods((current) =>
      current.includes(meal)
        ? current.length > 1
          ? current.filter((entry) => entry !== meal)
          : current
        : [...current, meal]
    );
  };

  const applyTemplate = (index: number, template: (typeof MENU_TEMPLATES)[number]) => {
    setMenuDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index
          ? {
              name: template.name,
              price: template.price,
              mealCategories: template.mealCategories,
              allergenTags: template.allergenTags,
            }
          : draft
      )
    );
  };

  const saveKitchenStep = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await apiFetch('/api/vendor/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'kitchen',
          name: kitchenName,
          contactName,
          contactEmail,
          contactPhone,
          address,
          offersPickup,
          offersDelivery,
          deliveryRadiusKm,
          preparationDays,
          mealPeriods,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save kitchen profile');
      }
      const data = await response.json();
      applyPayload(data);
      setActiveStep('menu');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveMenuStep = async () => {
    const items = menuDrafts
      .filter((draft) => draft.name.trim() && draft.price.trim())
      .map((draft) => ({
        name: draft.name.trim(),
        price: parseFloat(draft.price),
        mealCategories: draft.mealCategories,
        allergenTags: draft.allergenTags,
      }));

    const needed = Math.max(0, MIN_ONBOARDING_MENU_ITEMS - (status?.menuItemCount || 0));
    if (items.length < needed) {
      setError(`Add at least ${needed} more menu item${needed === 1 ? '' : 's'} to continue.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await apiFetch('/api/vendor/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'menu', items }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save menu');
      }
      const data = await response.json();
      applyPayload(data);
      setActiveStep('launch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const goLive = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await apiFetch('/api/vendor/onboarding?action=complete', {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Could not go live');
      }
      router.push(vendorPath('/vendor/kds?welcome=1'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go live');
    } finally {
      setSaving(false);
    }
  };

  const stepIndex = STEPS.findIndex((step) => step.id === activeStep);

  return (
    <VendorShell
      active="settings"
      title="Vendor onboarding"
      subtitle="Get your kitchen live on SafePlate in about 10 minutes."
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-500">Setup progress</p>
              <p className="text-2xl font-semibold text-slate-900">
                {status?.progressPercent ?? 0}%
              </p>
            </div>
            <Badge variant="info">~10 min</Badge>
          </div>
          <div className="flex gap-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`flex-1 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                  activeStep === step.id
                    ? 'bg-emerald-100 text-emerald-800'
                    : index < stepIndex
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <span className="font-semibold block">{step.label}</span>
                <span className="text-xs">{step.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <Card className="py-12 text-center text-slate-500">Loading onboarding...</Card>
        ) : (
          <>
            {error && (
              <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card>
            )}

            {activeStep === 'kitchen' && (
              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Kitchen profile</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Group homes use this to find you and schedule weekly meal contracts.
                  </p>
                </div>

                <Input
                  label="Kitchen / business name"
                  value={kitchenName}
                  onChange={(e) => setKitchenName(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                  <Input
                    label="Phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Street"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  />
                  <Input
                    label="City"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                  <Input
                    label="State"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  />
                  <Input
                    label="ZIP"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={offersPickup}
                      onChange={(e) => setOffersPickup(e.target.checked)}
                    />
                    Offer pickup
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={offersDelivery}
                      onChange={(e) => setOffersDelivery(e.target.checked)}
                    />
                    Offer delivery
                  </label>
                </div>

                <Input
                  label="Delivery radius (km)"
                  type="number"
                  min={1}
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(Number(e.target.value) || 1)}
                  disabled={!offersDelivery}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Weekly prep days</p>
                  <div className="grid grid-cols-7 gap-1">
                    {PREPARATION_DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => togglePrepDay(day.value)}
                        className={`rounded-lg py-2 text-xs font-semibold ${
                          preparationDays.includes(day.value)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Meals you serve</p>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_CATEGORIES.map((meal) => (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => toggleMeal(meal)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          mealPeriods.includes(meal)
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-200 text-slate-600'
                        }`}
                      >
                        {MEAL_CATEGORY_LABELS[meal]}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={saveKitchenStep} disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Saving...' : 'Continue to menu'}
                </Button>
              </Card>
            )}

            {activeStep === 'menu' && (
              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Your first menu items</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Add at least {MIN_ONBOARDING_MENU_ITEMS} items. Allergen tags keep group homes
                    safe — be accurate.
                  </p>
                  {status && status.menuItemCount > 0 && (
                    <p className="text-sm text-emerald-700 mt-2">
                      You already have {status.menuItemCount} item
                      {status.menuItemCount === 1 ? '' : 's'} saved.
                    </p>
                  )}
                </div>

                {menuDrafts.map((draft, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">Item {index + 1}</p>
                      {MENU_TEMPLATES[index] && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-emerald-700"
                          onClick={() => applyTemplate(index, MENU_TEMPLATES[index])}
                        >
                          Use template
                        </button>
                      )}
                    </div>
                    <Input
                      label="Item name"
                      value={draft.name}
                      onChange={(e) =>
                        setMenuDrafts((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, name: e.target.value } : entry
                          )
                        )
                      }
                    />
                    <Input
                      label="Price (USD)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft.price}
                      onChange={(e) =>
                        setMenuDrafts((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, price: e.target.value } : entry
                          )
                        )
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      {MEAL_CATEGORIES.map((meal) => (
                        <button
                          key={meal}
                          type="button"
                          onClick={() =>
                            setMenuDrafts((current) =>
                              current.map((entry, i) =>
                                i === index
                                  ? {
                                      ...entry,
                                      mealCategories: entry.mealCategories.includes(meal)
                                        ? entry.mealCategories.filter((m) => m !== meal)
                                        : [...entry.mealCategories, meal],
                                    }
                                  : entry
                              )
                            )
                          }
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            draft.mealCategories.includes(meal)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {MEAL_CATEGORY_LABELS[meal]}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGEN_OPTIONS.map((allergen) => (
                        <button
                          key={allergen}
                          type="button"
                          onClick={() =>
                            setMenuDrafts((current) =>
                              current.map((entry, i) =>
                                i === index
                                  ? {
                                      ...entry,
                                      allergenTags: entry.allergenTags.includes(allergen)
                                        ? entry.allergenTags.filter((tag) => tag !== allergen)
                                        : [...entry.allergenTags, allergen],
                                    }
                                  : entry
                              )
                            )
                          }
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            draft.allergenTags.includes(allergen)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {allergen.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={saveMenuStep} disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Saving...' : 'Continue to go live'}
                </Button>
              </Card>
            )}

            {activeStep === 'launch' && status && (
              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Ready to go live?</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Once published, group homes in your delivery area can start contractual orders
                    with your kitchen.
                  </p>
                </div>

                <ul className="space-y-3">
                  {status.checklist
                    .filter((item) => item.id !== 'stripe')
                    .map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3"
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            item.complete
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {item.complete ? '✓' : '·'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-500">{item.description}</p>
                        </div>
                      </li>
                    ))}
                </ul>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800 mb-2">What happens next</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Your kitchen appears on the group home marketplace</li>
                    <li>New contractual orders show up on your Kitchen screen (KDS)</li>
                    <li>Connect Stripe later under Settings → Payments to receive payouts</li>
                  </ol>
                </div>

                <p className="text-xs text-slate-500">
                  Contract lengths offered: {CONTRACT_DURATIONS_MONTHS.join(', ')} months (editable
                  in Settings later).
                </p>

                <Button onClick={goLive} disabled={saving} size="lg" className="w-full sm:w-auto">
                  {saving ? 'Publishing...' : 'Publish my kitchen'}
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </VendorShell>
  );
}

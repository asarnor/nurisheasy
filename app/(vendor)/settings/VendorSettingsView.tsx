'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { VendorShell } from '@/components/layout/VendorShell';
import { VendorAccountPanel } from '@/components/vendor/VendorAccountPanel';
import { apiFetch } from '@/lib/utils/api';
import {
  CONTRACT_DURATIONS_MONTHS,
  PREPARATION_DAYS,
  type ContractDurationMonths,
} from '@/lib/contract-options';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';
import {
  ALLERGEN_TAGS,
  DEFAULT_VENDOR_SETTINGS,
  VENDOR_CERTIFICATIONS,
  formatCentsAsDollars,
  parseDollarsToCents,
  toggleArrayItem,
  type AllergenTag,
  type VendorCertification,
  type VendorSettings,
} from '@/lib/vendor-settings';

type SettingsTab =
  | 'profile'
  | 'service'
  | 'operations'
  | 'payments'
  | 'compliance'
  | 'contracts'
  | 'notifications'
  | 'account';

const VALID_TABS: SettingsTab[] = [
  'profile',
  'service',
  'operations',
  'payments',
  'compliance',
  'contracts',
  'notifications',
  'account',
];

interface VendorOrganization {
  id: string;
  name: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  stripeAccountId?: string;
  stripeConnected: boolean;
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'service', label: 'Service area' },
  { id: 'operations', label: 'Operations' },
  { id: 'payments', label: 'Payments' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account', label: 'Account' },
];

const Field: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="space-y-2">
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

export default function VendorSettingsView() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [organization, setOrganization] = useState<VendorOrganization | null>(null);
  const [settings, setSettings] = useState<VendorSettings>(DEFAULT_VENDOR_SETTINGS);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [businessName, setBusinessName] = useState('');
  const [minimumOrderDollars, setMinimumOrderDollars] = useState('20.00');
  const [deliveryFeeDollars, setDeliveryFeeDollars] = useState('15.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TABS.includes(tab as SettingsTab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/vendor/settings');
      if (!response.ok) return;

      const data = await response.json();
      setOrganization(data.organization);
      setSettings(data.settings);
      setBusinessName(data.organization.name || '');
      if (data.organization.address) {
        setAddress(data.organization.address);
      }
      setMinimumOrderDollars((data.settings.minimumOrderCents / 100).toFixed(2));
      setDeliveryFeeDollars((data.settings.deliveryFeeCents / 100).toFixed(2));
    } catch (error) {
      console.error('Error fetching vendor settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (patch: Partial<VendorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setSaveMessage(null);
  };

  const togglePrepDay = (day: number) => {
    const next = toggleArrayItem(settings.preparationDays, day);
    updateSettings({
      preparationDays: next.length ? next : [day],
    });
  };

  const toggleMealPeriod = (meal: MealCategory) => {
    const next = toggleArrayItem(settings.mealPeriods, meal);
    updateSettings({
      mealPeriods: next.length ? next : ['dinner'],
    });
  };

  const toggleContractDuration = (months: ContractDurationMonths) => {
    const next = toggleArrayItem(settings.offeredContractDurations, months);
    updateSettings({
      offeredContractDurations: next.length ? next : [months],
    });
  };

  const toggleCertification = (cert: VendorCertification) => {
    updateSettings({
      certifications: toggleArrayItem(settings.certifications, cert),
    });
  };

  const toggleFacilityAllergen = (allergen: AllergenTag) => {
    updateSettings({
      facilityAllergensHandled: toggleArrayItem(
        settings.facilityAllergensHandled,
        allergen
      ),
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const response = await apiFetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          address,
          settings: {
            ...settings,
            minimumOrderCents: parseDollarsToCents(minimumOrderDollars),
            deliveryFeeCents: parseDollarsToCents(deliveryFeeDollars),
          },
        }),
      });

      if (!response.ok) {
        setSaveMessage('Could not save settings. Please try again.');
        return;
      }

      const data = await response.json();
      setOrganization(data.organization);
      setSettings(data.settings);
      setSaveMessage('Settings saved successfully.');
    } catch (error) {
      console.error('Error saving vendor settings:', error);
      setSaveMessage('Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <Field label="Kitchen / business name" description="Shown to group homes in the marketplace.">
        <Input
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            setSaveMessage(null);
          }}
          placeholder="Momma's Whole Foods"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Contact name">
          <Input
            value={settings.contactName}
            onChange={(e) => updateSettings({ contactName: e.target.value })}
            placeholder="Maria Lopez"
          />
        </Field>
        <Field label="Contact phone">
          <Input
            value={settings.contactPhone}
            onChange={(e) => updateSettings({ contactPhone: e.target.value })}
            placeholder="(512) 555-0142"
          />
        </Field>
      </div>

      <Field label="Contact email">
        <Input
          type="email"
          value={settings.contactEmail}
          onChange={(e) => updateSettings({ contactEmail: e.target.value })}
          placeholder="kitchen@example.com"
        />
      </Field>

      <Field
        label="Business description"
        description="Brief summary for your marketplace listing."
      >
        <textarea
          value={settings.description}
          onChange={(e) => updateSettings({ description: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Whole-food meals for group homes..."
        />
      </Field>

      <Field label="Kitchen address" description="Used for pickup and delivery radius calculations.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Street"
            value={address.street}
            onChange={(e) => {
              setAddress({ ...address, street: e.target.value });
              setSaveMessage(null);
            }}
          />
          <Input
            label="City"
            value={address.city}
            onChange={(e) => {
              setAddress({ ...address, city: e.target.value });
              setSaveMessage(null);
            }}
          />
          <Input
            label="State"
            value={address.state}
            onChange={(e) => {
              setAddress({ ...address, state: e.target.value });
              setSaveMessage(null);
            }}
          />
          <Input
            label="ZIP code"
            value={address.zipCode}
            onChange={(e) => {
              setAddress({ ...address, zipCode: e.target.value });
              setSaveMessage(null);
            }}
          />
        </div>
      </Field>
    </div>
  );

  const renderService = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Toggle
          label="Offer pickup"
          checked={settings.offersPickup}
          onChange={(checked) => updateSettings({ offersPickup: checked })}
        />
        <Toggle
          label="Offer delivery"
          checked={settings.offersDelivery}
          onChange={(checked) => updateSettings({ offersDelivery: checked })}
        />
      </div>

      <Field
        label="Delivery radius (km)"
        description="Maximum distance you'll deliver from your kitchen."
      >
        <Input
          type="number"
          min={1}
          value={settings.deliveryRadiusKm}
          onChange={(e) =>
            updateSettings({ deliveryRadiusKm: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </Field>

      <Field
        label="Weekly preparation days"
        description="Days you prepare meals for contracted group homes."
      >
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {PREPARATION_DAYS.map((day) => {
            const active = settings.preparationDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => togglePrepDay(day.value)}
                className={`rounded-lg px-1 py-2 text-center text-xs font-semibold sm:text-sm ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="hidden sm:inline">{day.label.slice(0, 3)}</span>
                <span className="sm:hidden">{day.label.charAt(0)}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Meal periods served">
        <div className="flex flex-wrap gap-2">
          {MEAL_CATEGORIES.map((meal) => {
            const active = settings.mealPeriods.includes(meal);
            return (
              <button
                key={meal}
                type="button"
                onClick={() => toggleMealPeriod(meal)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {MEAL_CATEGORY_LABELS[meal]}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Order cutoff time" description="Last time to place orders (24h).">
          <Input
            type="time"
            value={settings.orderCutoffTime}
            onChange={(e) => updateSettings({ orderCutoffTime: e.target.value })}
          />
        </Field>
        <Field label="Minimum lead time (hours)" description="How far in advance orders must be placed.">
          <Input
            type="number"
            min={0}
            value={settings.advanceOrderMinHours}
            onChange={(e) =>
              updateSettings({ advanceOrderMinHours: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
      </div>
    </div>
  );

  const renderOperations = () => (
    <div className="space-y-6">
      <Field
        label="Default prep time (minutes)"
        description="Used when estimating ready times on the KDS."
      >
        <Input
          type="number"
          min={1}
          value={settings.defaultPrepTimeMinutes}
          onChange={(e) =>
            updateSettings({
              defaultPrepTimeMinutes: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </Field>

      <Toggle
        label="Auto-accept incoming orders"
        checked={settings.autoAcceptOrders}
        onChange={(checked) => updateSettings({ autoAcceptOrders: checked })}
      />

      <Toggle
        label="KDS sound alerts for new orders"
        checked={settings.kdsSoundEnabled}
        onChange={(checked) => updateSettings({ kdsSoundEnabled: checked })}
      />
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-700">Stripe Connect</p>
          <Badge variant={organization?.stripeConnected ? 'success' : 'warning'}>
            {organization?.stripeConnected ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
        {organization?.stripeConnected ? (
          <p className="mt-2 text-sm text-slate-600">
            Payouts are enabled for account{' '}
            <span className="font-mono text-xs">{organization.stripeAccountId}</span>.
            Funds are deposited on your Stripe payout schedule (typically daily or weekly).
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Connect a Stripe account to receive payouts from group home orders.
          </p>
        )}
        <Button variant="secondary" className="mt-4" disabled>
          Open Stripe Dashboard
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          Stripe dashboard link will be available once live Connect onboarding is configured.
        </p>
      </div>
    </div>
  );

  const renderCompliance = () => {
    const reviewStatus = settings.certificationsReviewStatus;
    const reviewBadgeVariant =
      reviewStatus === 'approved'
        ? 'success'
        : reviewStatus === 'rejected'
        ? 'danger'
        : 'warning';
    const reviewLabel =
      reviewStatus === 'approved'
        ? 'Certifications approved'
        : reviewStatus === 'rejected'
        ? 'Review rejected — see admin notes'
        : 'Certifications pending admin review';

    return (
      <div className="space-y-6">
        <Field label="Certifications & claims">
          <div className="mb-3">
            <Badge variant={reviewBadgeVariant as any}>{reviewLabel}</Badge>
            <p className="mt-1 text-xs text-slate-500">
              Certifications you check below are self-reported until an admin
              reviews them. Consumers see approved certifications without an
              &ldquo;unverified&rdquo; label.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {VENDOR_CERTIFICATIONS.map((cert) => {
              const active = settings.certifications.includes(cert.id);
              return (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => toggleCertification(cert.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {active ? '✓ ' : ''}
                  {cert.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Facility allergens handled"
          description="Allergens handled anywhere in your kitchen — even if not in every dish. Consumers with strict allergies can hard-block vendors whose facility handles their critical allergens."
        >
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_TAGS.map((allergen) => {
              const active = settings.facilityAllergensHandled.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleFacilityAllergen(allergen)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {active ? '⚠ ' : ''}
                  {allergen.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Allergen handling policy"
          description="How you prevent cross-contact — visible to group home administrators."
        >
          <textarea
            value={settings.allergenPolicyNotes}
            onChange={(e) => updateSettings({ allergenPolicyNotes: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Field>

        <Field label="Ingredient sourcing notes">
          <textarea
            value={settings.ingredientSourcingNotes}
            onChange={(e) => updateSettings({ ingredientSourcingNotes: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </Field>
      </div>
    );
  };

  const renderContracts = () => (
    <div className="space-y-6">
      <Toggle
        label="Accepting new long-term contracts"
        checked={settings.acceptingNewContracts}
        onChange={(checked) => updateSettings({ acceptingNewContracts: checked })}
      />

      <Field label="Contract lengths offered">
        <div className="flex flex-wrap gap-2">
          {CONTRACT_DURATIONS_MONTHS.map((months) => {
            const active = settings.offeredContractDurations.includes(months);
            return (
              <button
                key={months}
                type="button"
                onClick={() => toggleContractDuration(months)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {months} months
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Minimum order value">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={minimumOrderDollars}
            onChange={(e) => {
              setMinimumOrderDollars(e.target.value);
              setSaveMessage(null);
            }}
          />
        </Field>
        <Field
          label="Delivery fee"
          description={`Current default: ${formatCentsAsDollars(settings.deliveryFeeCents)}`}
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={deliveryFeeDollars}
            onChange={(e) => {
              setDeliveryFeeDollars(e.target.value);
              setSaveMessage(null);
            }}
            disabled={!settings.offersDelivery}
          />
        </Field>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <Toggle
        label="New order received"
        checked={settings.notifyNewOrder}
        onChange={(checked) => updateSettings({ notifyNewOrder: checked })}
      />
      <Toggle
        label="Late order acceptance warning"
        checked={settings.notifyLateAcceptance}
        onChange={(checked) => updateSettings({ notifyLateAcceptance: checked })}
      />
      <Toggle
        label="New customer review"
        checked={settings.notifyNewReview}
        onChange={(checked) => updateSettings({ notifyNewReview: checked })}
      />
      <Toggle
        label="Contract ending soon"
        checked={settings.notifyContractEnding}
        onChange={(checked) => updateSettings({ notifyContractEnding: checked })}
      />

      <div className="border-t border-slate-200 pt-4 mt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Quiet hours</p>
        <p className="text-xs text-slate-500 mb-3">
          Non-urgent alerts are paused during this window.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Quiet hours start">
            <Input
              type="time"
              value={settings.notificationQuietHoursStart}
              onChange={(e) =>
                updateSettings({ notificationQuietHoursStart: e.target.value })
              }
            />
          </Field>
          <Field label="Quiet hours end">
            <Input
              type="time"
              value={settings.notificationQuietHoursEnd}
              onChange={(e) => updateSettings({ notificationQuietHoursEnd: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <VendorAccountPanel organizationName={organization?.name} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfile();
      case 'service':
        return renderService();
      case 'operations':
        return renderOperations();
      case 'payments':
        return renderPayments();
      case 'compliance':
        return renderCompliance();
      case 'contracts':
        return renderContracts();
      case 'notifications':
        return renderNotifications();
      case 'account':
        return renderAccount();
      default:
        return null;
    }
  };

  return (
    <VendorShell
      active="settings"
      title="Vendor Settings"
      subtitle="Profile, service area, operations, and notifications."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">Loading settings...</p>
          </Card>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Card className="p-5 sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  {TABS.find((tab) => tab.id === activeTab)?.label}
                </h2>
              </div>
              {renderTabContent()}
            </Card>

            {activeTab !== 'account' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky bottom-4 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-lg">
              <div>
                {saveMessage && (
                  <p
                    className={`text-sm font-medium ${
                      saveMessage.includes('success') ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
            )}
          </>
        )}
      </div>
    </VendorShell>
  );
}

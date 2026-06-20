'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { ContractCheckoutOptions } from '@/components/consumer/ContractCheckoutOptions';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath, isDebugClient } from '@/lib/utils/debug-client';
import {
  DEFAULT_CONSUMER_SETTINGS,
  type ConsumerSettings,
} from '@/lib/consumer-settings';
import type { ConsumerOnboardingStatus, ConsumerOnboardingStep } from '@/lib/consumer-onboarding';
import type { OrderContractOptions } from '@/lib/contract-options';

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

const PREFERENCE_OPTIONS = [
  'LOW_SODIUM',
  'LOW_FAT',
  'VEGETARIAN',
  'VEGAN',
  'KOSHER',
  'HALAL',
];

const STEPS: { id: ConsumerOnboardingStep; label: string; hint: string }[] = [
  { id: 'facility', label: 'Facility', hint: 'Your group home' },
  { id: 'safety', label: 'Safety', hint: 'Allergen restrictions' },
  { id: 'ordering', label: 'Ordering', hint: 'How SafePlate works' },
];

const HOW_IT_WORKS = [
  {
    title: 'Browse the marketplace',
    body: 'Menus are filtered by your address and critical allergen restrictions.',
  },
  {
    title: 'Order on a contract',
    body: 'You set a recurring schedule — contract length, prep day, and meal periods.',
  },
  {
    title: 'Safety is enforced',
    body: 'Unsafe items are blocked at checkout. Preferences show as warnings only.',
  },
  {
    title: 'Track & review',
    body: 'Follow orders and deliveries in My Account, then leave vendor reviews.',
  },
];

export default function ConsumerOnboardingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step') as ConsumerOnboardingStep | null;

  const [activeStep, setActiveStep] = useState<ConsumerOnboardingStep>('facility');
  const [status, setStatus] = useState<ConsumerOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facilityName, setFacilityName] = useState('My Group Home');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });

  const [criticalAllergens, setCriticalAllergens] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [confirmedNoCriticalAllergens, setConfirmedNoCriticalAllergens] = useState(false);

  const [contractOptions, setContractOptions] = useState<OrderContractOptions>(
    DEFAULT_CONSUMER_SETTINGS.defaultContractOptions
  );
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (stepParam && STEPS.some((step) => step.id === stepParam)) {
      setActiveStep(stepParam);
    }
  }, [stepParam]);

  useEffect(() => {
    bootstrap();
  }, []);

  const applyPayload = (data: {
    organization: {
      name: string;
      address?: typeof address;
      safetyProfile?: {
        criticalAllergens: string[];
        preferences: string[];
        confirmedNoCriticalAllergens?: boolean;
      };
      settings: ConsumerSettings;
    };
    status: ConsumerOnboardingStatus;
  }) => {
    setStatus(data.status);
    setFacilityName(data.organization.name || 'My Group Home');
    setContactName(data.organization.settings.contactName || '');
    setContactEmail(data.organization.settings.contactEmail || '');
    setContactPhone(data.organization.settings.contactPhone || '');
    if (data.organization.address) {
      setAddress({
        street: data.organization.address.street || '',
        city: data.organization.address.city || '',
        state: data.organization.address.state || '',
        zipCode: data.organization.address.zipCode || '',
      });
    }
    setCriticalAllergens(data.organization.safetyProfile?.criticalAllergens || []);
    setPreferences(data.organization.safetyProfile?.preferences || []);
    setConfirmedNoCriticalAllergens(
      Boolean(data.organization.safetyProfile?.confirmedNoCriticalAllergens)
    );
    setContractOptions(data.organization.settings.defaultContractOptions);
    setAcknowledged(Boolean(data.organization.settings.orderingStepAcknowledged));
    if (data.status.isComplete) {
      setActiveStep('ordering');
    } else {
      setActiveStep(data.status.nextStep);
    }
  };

  const bootstrap = async () => {
    try {
      setLoading(true);
      await apiFetch('/api/consumer/onboarding?action=bootstrap', { method: 'POST' });
      const response = await apiFetch('/api/consumer/onboarding');
      if (!response.ok) throw new Error('Failed to load onboarding');
      const data = await response.json();
      applyPayload(data);
    } catch (err) {
      console.error(err);
      setError('Could not load onboarding. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveFacility = async () => {
    setSaving(true);
    setError(null);
    const response = await apiFetch('/api/consumer/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'facility',
        name: facilityName,
        contactName,
        contactEmail,
        contactPhone,
        address,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Failed to save facility profile.');
      return;
    }
    const data = await response.json();
    applyPayload(data);
    setActiveStep('safety');
  };

  const saveSafety = async () => {
    if (!confirmedNoCriticalAllergens && criticalAllergens.length === 0) {
      setError('Select critical allergens or confirm there are none.');
      return;
    }

    setSaving(true);
    setError(null);
    const response = await apiFetch('/api/consumer/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'safety',
        criticalAllergens: confirmedNoCriticalAllergens ? [] : criticalAllergens,
        preferences,
        confirmedNoCriticalAllergens,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Failed to save safety settings.');
      return;
    }
    const data = await response.json();
    applyPayload(data);
    setActiveStep('ordering');
  };

  const completeOnboarding = async () => {
    if (!acknowledged) {
      setError('Please confirm you understand how ordering works.');
      return;
    }

    setSaving(true);
    setError(null);

    const patchResponse = await apiFetch('/api/consumer/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'ordering',
        defaultContractOptions: contractOptions,
        orderingStepAcknowledged: true,
      }),
    });

    if (!patchResponse.ok) {
      setSaving(false);
      const data = await patchResponse.json();
      setError(data.error || 'Failed to save order preferences.');
      return;
    }

    const completeResponse = await apiFetch('/api/consumer/onboarding?action=complete', {
      method: 'POST',
    });
    setSaving(false);

    if (!completeResponse.ok) {
      const data = await completeResponse.json();
      setError(data.error || 'Could not complete onboarding.');
      return;
    }

    router.push(consumerPath('/marketplace?welcome=1'));
  };

  const resetDemo = async () => {
    setSaving(true);
    await apiFetch('/api/consumer/onboarding?action=reset-demo', { method: 'POST' });
    await bootstrap();
    setSaving(false);
  };

  const toggleAllergen = (allergen: string) => {
    setConfirmedNoCriticalAllergens(false);
    setCriticalAllergens((current) =>
      current.includes(allergen)
        ? current.filter((entry) => entry !== allergen)
        : [...current, allergen]
    );
    setError(null);
  };

  const togglePreference = (preference: string) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((entry) => entry !== preference)
        : [...current, preference]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading onboarding...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Set up your group home</h1>
          <p className="mt-2 text-sm text-slate-500">
            About 5 minutes to start ordering safely from local kitchens.
          </p>
          {status && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="info">{status.progressPercent}% complete</Badge>
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {STEPS.map((step) => {
            const item = status?.checklist.find((entry) => entry.id === step.id);
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`min-w-[120px] flex-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-emerald-300 bg-white shadow-sm'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.hint}</p>
                {item?.complete ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">Complete</p>
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? (
          <Card className="mb-4 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </Card>
        ) : null}

        {activeStep === 'facility' && (
          <Card className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Facility profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                We use this to match vendors in your delivery area.
              </p>
            </div>
            <Input
              label="Group home / facility name"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
            />
            <Input
              label="Primary contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Contact phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <Input
                label="Contact email (optional)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <Input
              label="Street address"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
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
            <Button onClick={saveFacility} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Continue to safety'}
            </Button>
          </Card>
        )}

        {activeStep === 'safety' && (
          <Card className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Safety restrictions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Critical allergens are <strong>never</strong> allowed through checkout.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Critical allergens</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((allergen) => (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => toggleAllergen(allergen)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      criticalAllergens.includes(allergen)
                        ? 'bg-rose-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {allergen.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Toggle
                label="No critical allergen restrictions at our facility"
                checked={confirmedNoCriticalAllergens}
                onChange={(checked) => {
                  setConfirmedNoCriticalAllergens(checked);
                  if (checked) setCriticalAllergens([]);
                  setError(null);
                }}
              />
              <p className="mt-1 text-xs text-slate-500">
                Only select this if residents have no hard-block allergens.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Dietary preferences (optional warnings)
              </p>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_OPTIONS.map((preference) => (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => togglePreference(preference)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      preferences.includes(preference)
                        ? 'bg-amber-500 text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {preference.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={saveSafety} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Continue to ordering'}
            </Button>
          </Card>
        )}

        {activeStep === 'ordering' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">How SafePlate works</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {HOW_IT_WORKS.map((item) => (
                  <div key={item.title} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-1">
              <ContractCheckoutOptions value={contractOptions} onChange={setContractOptions} />
            </Card>

            <Card className="p-6">
              <Toggle
                label="I understand how contract ordering works on SafePlate"
                checked={acknowledged}
                onChange={setAcknowledged}
              />
              <p className="mt-1 text-xs text-slate-500">
                These defaults can be changed anytime under Account → Order settings.
              </p>
              <Button
                onClick={completeOnboarding}
                disabled={saving}
                className="mt-6 w-full"
              >
                {saving ? 'Finishing...' : 'Go to marketplace'}
              </Button>
            </Card>
          </div>
        )}

        <Card className="mt-6 border-dashed border-slate-200 bg-white/70 p-4">
          {isDebugClient() ? (
            <>
              <Button variant="secondary" onClick={resetDemo} disabled={saving}>
                Reset onboarding demo
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                Restores the demo group home profile so you can run onboarding again.
              </p>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

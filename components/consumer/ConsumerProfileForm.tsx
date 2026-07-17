'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/utils/api';

interface SafetyProfile {
  criticalAllergens: string[];
  preferences: string[];
  taxExempt: boolean;
  blockFacilityCrossContact?: boolean;
}

interface Organization {
  id: string;
  name: string;
  safetyProfile: SafetyProfile;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

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

const preferenceOptions = [
  'LOW_SODIUM',
  'LOW_FAT',
  'VEGETARIAN',
  'VEGAN',
  'KOSHER',
  'HALAL',
];

export const ConsumerProfileForm: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setFacilityName(data.organization.name || '');
        if (data.organization.address) {
          setAddress(data.organization.address);
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllergenToggle = (allergen: string) => {
    if (!organization) return;

    const currentAllergens = organization.safetyProfile.criticalAllergens;
    const newAllergens = currentAllergens.includes(allergen)
      ? currentAllergens.filter((a) => a !== allergen)
      : [...currentAllergens, allergen];

    setOrganization({
      ...organization,
      safetyProfile: {
        ...organization.safetyProfile,
        criticalAllergens: newAllergens,
      },
    });
    setSaveMessage(null);
  };

  const handlePreferenceToggle = (preference: string) => {
    if (!organization) return;

    const currentPreferences = organization.safetyProfile.preferences;
    const newPreferences = currentPreferences.includes(preference)
      ? currentPreferences.filter((p) => p !== preference)
      : [...currentPreferences, preference];

    setOrganization({
      ...organization,
      safetyProfile: {
        ...organization.safetyProfile,
        preferences: newPreferences,
      },
    });
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      setSaveMessage(null);
      const response = await apiFetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: facilityName,
          safetyProfile: organization.safetyProfile,
          address,
        }),
      });

      if (response.ok) {
        setSaveMessage('Profile saved successfully.');
      } else {
        setSaveMessage('Could not save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500">Loading profile...</p>;
  }

  if (!organization) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-500">Organization not found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold mb-4">Facility information</h2>
        <Input
          label="Group home / facility name"
          value={facilityName}
          onChange={(e) => {
            setFacilityName(e.target.value);
            setSaveMessage(null);
          }}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Critical allergens</h2>
        <p className="text-sm text-slate-500 mb-4">
          Items containing these allergens are blocked from your marketplace.
        </p>
        <div className="space-y-3">
          {allergenOptions.map((allergen) => (
            <Toggle
              key={allergen}
              label={allergen.replace(/_/g, ' ')}
              checked={organization.safetyProfile.criticalAllergens.includes(allergen)}
              onChange={() => handleAllergenToggle(allergen)}
            />
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <Toggle
            label="Also block vendors whose kitchen handles any of my critical allergens"
            checked={Boolean(organization.safetyProfile.blockFacilityCrossContact)}
            onChange={(checked) => {
              setOrganization({
                ...organization,
                safetyProfile: {
                  ...organization.safetyProfile,
                  blockFacilityCrossContact: checked,
                },
              });
              setSaveMessage(null);
            }}
          />
          <p className="mt-2 text-xs text-slate-600">
            Recommended for severe allergies. When on, we hide any vendor whose
            <em> facilityAllergensHandled </em>
            list overlaps with your critical allergens — even if a specific
            dish is tagged allergen-free — because of cross-contact risk in
            the vendor&rsquo;s kitchen.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Dietary preferences</h2>
        <p className="text-sm text-slate-500 mb-4">
          Used to filter and recommend suitable menu items.
        </p>
        <div className="space-y-3">
          {preferenceOptions.map((preference) => (
            <Toggle
              key={preference}
              label={preference.replace(/_/g, ' ')}
              checked={organization.safetyProfile.preferences.includes(preference)}
              onChange={() => handlePreferenceToggle(preference)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Tax settings</h2>
        <Toggle
          label="Tax exempt facility"
          checked={organization.safetyProfile.taxExempt}
          onChange={(checked) => {
            setOrganization({
              ...organization,
              safetyProfile: { ...organization.safetyProfile, taxExempt: checked },
            });
            setSaveMessage(null);
          }}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Delivery address</h2>
        <div className="space-y-4">
          <Input
            label="Street address"
            value={address.street}
            onChange={(e) => {
              setAddress({ ...address, street: e.target.value });
              setSaveMessage(null);
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
          <Input
            label="ZIP code"
            value={address.zipCode}
            onChange={(e) => {
              setAddress({ ...address, zipCode: e.target.value });
              setSaveMessage(null);
            }}
          />
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {saveMessage && (
          <p
            className={`text-sm font-medium ${
              saveMessage.includes('success') ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {saveMessage}
          </p>
        )}
        <Button onClick={handleSave} disabled={saving} className="sm:ml-auto">
          {saving ? 'Saving...' : 'Save profile'}
        </Button>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';

interface SafetyProfile {
  criticalAllergens: string[];
  preferences: string[];
  taxExempt: boolean;
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

export default function ProfilePage() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
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
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          safetyProfile: organization.safetyProfile,
          address,
        }),
      });

      if (response.ok) {
        alert('Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center py-12">
          <p className="text-gray-500">Organization not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader title="Profile" showBack onBack={() => router.back()} />
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header title="Profile Settings" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 hidden md:block">Profile Settings</h1>

        <div className="space-y-6">
          {/* Dietary Restrictions */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Dietary Restrictions</h2>
            <p className="text-sm text-gray-600 mb-4">
              These restrictions will block items containing these allergens from appearing in your marketplace.
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
          </Card>

          {/* Preferences */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Dietary Preferences</h2>
            <p className="text-sm text-gray-600 mb-4">
              These preferences will be used to filter and recommend items.
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

          {/* Tax Exempt */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Tax Settings</h2>
            <Toggle
              label="Tax Exempt"
              checked={organization.safetyProfile.taxExempt}
              onChange={(checked) =>
                setOrganization({
                  ...organization,
                  safetyProfile: {
                    ...organization.safetyProfile,
                    taxExempt: checked,
                  },
                })
              }
            />
          </Card>

          {/* Delivery Address */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
            <div className="space-y-4">
              <Input
                label="Street Address"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <Input
                label="ZIP Code"
                value={address.zipCode}
                onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/marketplace')}
            className="flex flex-col items-center p-2 text-gray-600"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex flex-col items-center p-2 text-gray-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center p-2 text-green-600"
          >
            <span className="text-2xl">👤</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ContractCheckoutOptions } from '@/components/consumer/ContractCheckoutOptions';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { apiFetch } from '@/lib/utils/api';
import {
  DEFAULT_CONSUMER_SETTINGS,
  type ConsumerSettings,
} from '@/lib/consumer-settings';
import type { OrderContractOptions } from '@/lib/contract-options';

export default function AccountOrderSettingsPage() {
  const [contractOptions, setContractOptions] = useState<OrderContractOptions>(
    DEFAULT_CONSUMER_SETTINGS.defaultContractOptions
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/consumer/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.defaultContractOptions) {
          setContractOptions(data.settings.defaultContractOptions);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      const response = await apiFetch('/api/consumer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            defaultContractOptions: contractOptions,
          } satisfies Partial<ConsumerSettings>,
        }),
      });

      if (response.ok) {
        setSaveMessage('Default order settings saved.');
        localStorage.setItem('defaultContractOptions', JSON.stringify(contractOptions));
      } else {
        setSaveMessage('Could not save settings.');
      }
    } catch (error) {
      console.error('Error saving order settings:', error);
      setSaveMessage('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsumerAccountShell
      active="order-settings"
      title="Order settings"
      subtitle="Defaults applied when you check out from the marketplace."
    >
      {loading ? (
        <p className="text-slate-500">Loading order settings...</p>
      ) : (
        <div className="space-y-6">
          <Card className="p-1">
            <ContractCheckoutOptions value={contractOptions} onChange={setContractOptions} />
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {saveMessage && (
              <p
                className={`text-sm font-medium ${
                  saveMessage.includes('saved') ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {saveMessage}
              </p>
            )}
            <Button onClick={handleSave} disabled={saving} className="sm:ml-auto">
              {saving ? 'Saving...' : 'Save defaults'}
            </Button>
          </div>
        </div>
      )}
    </ConsumerAccountShell>
  );
}

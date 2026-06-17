'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { apiFetch } from '@/lib/utils/api';
import {
  DEFAULT_CONSUMER_SETTINGS,
  type ConsumerSettings,
} from '@/lib/consumer-settings';

export default function AccountNotificationsPage() {
  const [settings, setSettings] = useState<ConsumerSettings>(DEFAULT_CONSUMER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/consumer/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<ConsumerSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      const response = await apiFetch('/api/consumer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      setSaveMessage(
        response.ok ? 'Notification preferences saved.' : 'Could not save preferences.'
      );
    } catch (error) {
      console.error('Error saving notifications:', error);
      setSaveMessage('Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsumerAccountShell
      active="notifications"
      title="Notifications"
      subtitle="Choose how SafePlate keeps your team informed."
    >
      {loading ? (
        <p className="text-slate-500">Loading preferences...</p>
      ) : (
        <div className="space-y-6">
          <Card className="space-y-4">
            <Toggle
              label="Order status updates"
              checked={settings.notifyOrderUpdates}
              onChange={(checked) => update({ notifyOrderUpdates: checked })}
            />
            <Toggle
              label="Delivery & pickup reminders"
              checked={settings.notifyDeliveryReminders}
              onChange={(checked) => update({ notifyDeliveryReminders: checked })}
            />
            <Toggle
              label="Contract renewal reminders"
              checked={settings.notifyContractRenewal}
              onChange={(checked) => update({ notifyContractRenewal: checked })}
            />
            <Toggle
              label="Review reminders after delivery"
              checked={settings.notifyReviewReminders}
              onChange={(checked) => update({ notifyReviewReminders: checked })}
            />
            <Toggle
              label="Product updates & tips"
              checked={settings.notifyMarketing}
              onChange={(checked) => update({ notifyMarketing: checked })}
            />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-3">Quiet hours</h2>
            <p className="text-sm text-slate-500 mb-4">
              Non-urgent notifications are paused during this window.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Quiet hours start"
                type="time"
                value={settings.notificationQuietHoursStart}
                onChange={(e) => update({ notificationQuietHoursStart: e.target.value })}
              />
              <Input
                label="Quiet hours end"
                type="time"
                value={settings.notificationQuietHoursEnd}
                onChange={(e) => update({ notificationQuietHoursEnd: e.target.value })}
              />
            </div>
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
              {saving ? 'Saving...' : 'Save preferences'}
            </Button>
          </div>
        </div>
      )}
    </ConsumerAccountShell>
  );
}

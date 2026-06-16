'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { AdminShell } from '@/components/layout/AdminShell';
import { apiFetch } from '@/lib/utils/api';

interface PlatformRulesData {
  inventory: {
    trackStock: boolean;
    lowStockThreshold: number;
    autoDisableAtZero: boolean;
    requireDailyVerification: boolean;
    verificationWindowHours: number;
  };
  deliveryTiming: {
    maxPrepTimeMinutes: number;
    defaultDeliveryWindowMinutes: number;
    orderCutoffTime: string;
    advanceOrderMinHours: number;
    vendorAcceptanceTimeoutMinutes: number;
    lateDeliveryThresholdMinutes: number;
  };
  contractMinimums: {
    minimumOrderAmountCents: number;
    minimumVendorSubOrderCents: number;
    minimumMonthlyOrderCount: number;
    minimumWeeklyMenuItems: number;
    contractRenewalDays: number;
  };
  portionProtocols: {
    maxPortionsPerItem: number;
    maxItemsPerOrder: number;
    maxOrdersPerDay: number;
    requirePortionJustification: boolean;
    portionJustificationThreshold: number;
    defaultServingSizeOz: number;
    maxServingSizeOz: number;
  };
  platformFeePercent: number;
  deliveryRadiusKm: number;
}

function RuleField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step ?? 1}
      className={`w-24 px-2 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 border-slate-200 text-right ${className ?? ''}`}
    />
  );
}

export default function PlatformRulesPage() {
  const [rules, setRules] = useState<PlatformRulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await apiFetch('/api/admin/platform-rules');
      const data = await res.json();
      setRules(data.rules);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    if (!rules) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await apiFetch('/api/admin/platform-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setRules(data.rules);
      setSaveMessage({ type: 'success', text: 'Platform rules updated successfully' });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save rules',
      });
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof PlatformRulesData>(
    section: K,
    field: string,
    value: unknown,
  ) => {
    if (!rules) return;
    if (typeof rules[section] === 'object' && rules[section] !== null) {
      setRules({
        ...rules,
        [section]: { ...(rules[section] as Record<string, unknown>), [field]: value },
      });
    } else {
      setRules({ ...rules, [section]: value as PlatformRulesData[K] });
    }
  };

  if (loading) {
    return (
      <AdminShell title="Platform Rules" active="platform-rules">
        <div className="text-center py-12">
          <p className="text-slate-500">Loading platform rules...</p>
        </div>
      </AdminShell>
    );
  }

  if (!rules) {
    return (
      <AdminShell title="Platform Rules" active="platform-rules">
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load platform rules</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Platform Rules" subtitle="Configure inventory, delivery, contract, and portion policies" active="platform-rules">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Platform Rules</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure inventory, delivery, contract, and portion policies
            </p>
          </div>
          <Button onClick={saveRules} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {saveMessage && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              saveMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Global Settings */}
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Global Settings</h2>
            <RuleField label="Platform Fee (%)" description="Percentage fee charged on each order">
              <NumberInput
                value={rules.platformFeePercent}
                onChange={(v) => setRules({ ...rules, platformFeePercent: v })}
                min={0}
                max={100}
                step={0.5}
              />
            </RuleField>
            <RuleField label="Delivery Radius (km)" description="Maximum distance for vendor delivery">
              <NumberInput
                value={rules.deliveryRadiusKm}
                onChange={(v) => setRules({ ...rules, deliveryRadiusKm: v })}
                min={1}
              />
            </RuleField>
          </div>
        </Card>

        {/* Inventory Rules */}
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Inventory Management</h2>
            <p className="text-xs text-slate-500 mb-4">Control stock tracking and verification requirements</p>
            <RuleField label="Track Stock" description="Enable stock quantity tracking for menu items">
              <Toggle
                checked={rules.inventory.trackStock}
                onChange={(v) => update('inventory', 'trackStock', v)}
              />
            </RuleField>
            <RuleField label="Low Stock Threshold" description="Alert vendors when stock drops below this number">
              <NumberInput
                value={rules.inventory.lowStockThreshold}
                onChange={(v) => update('inventory', 'lowStockThreshold', v)}
                min={0}
              />
            </RuleField>
            <RuleField label="Auto-Disable at Zero" description="Automatically mark items unavailable when stock reaches 0">
              <Toggle
                checked={rules.inventory.autoDisableAtZero}
                onChange={(v) => update('inventory', 'autoDisableAtZero', v)}
              />
            </RuleField>
            <RuleField label="Require Daily Verification" description="Vendors must verify their inventory periodically">
              <Toggle
                checked={rules.inventory.requireDailyVerification}
                onChange={(v) => update('inventory', 'requireDailyVerification', v)}
              />
            </RuleField>
            <RuleField label="Verification Window (hours)" description="Maximum hours between inventory verifications">
              <NumberInput
                value={rules.inventory.verificationWindowHours}
                onChange={(v) => update('inventory', 'verificationWindowHours', v)}
                min={1}
              />
            </RuleField>
          </div>
        </Card>

        {/* Delivery Timing Rules */}
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Delivery Timing</h2>
            <p className="text-xs text-slate-500 mb-4">Set preparation times, cutoffs, and delivery windows</p>
            <RuleField label="Max Prep Time (minutes)" description="Maximum allowed preparation time per vendor">
              <NumberInput
                value={rules.deliveryTiming.maxPrepTimeMinutes}
                onChange={(v) => update('deliveryTiming', 'maxPrepTimeMinutes', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Default Delivery Window (minutes)" description="Standard delivery window from order confirmation">
              <NumberInput
                value={rules.deliveryTiming.defaultDeliveryWindowMinutes}
                onChange={(v) => update('deliveryTiming', 'defaultDeliveryWindowMinutes', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Order Cutoff Time" description="Latest time of day orders can be placed (HH:MM)">
              <input
                type="time"
                value={rules.deliveryTiming.orderCutoffTime}
                onChange={(e) => update('deliveryTiming', 'orderCutoffTime', e.target.value)}
                className="px-2 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 border-slate-200"
              />
            </RuleField>
            <RuleField label="Advance Order Min (hours)" description="Minimum lead time required for placing orders">
              <NumberInput
                value={rules.deliveryTiming.advanceOrderMinHours}
                onChange={(v) => update('deliveryTiming', 'advanceOrderMinHours', v)}
                min={0}
              />
            </RuleField>
            <RuleField label="Vendor Acceptance Timeout (minutes)" description="Time before vendor wake-up notification triggers">
              <NumberInput
                value={rules.deliveryTiming.vendorAcceptanceTimeoutMinutes}
                onChange={(v) => update('deliveryTiming', 'vendorAcceptanceTimeoutMinutes', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Late Delivery Threshold (minutes)" description="Minutes past estimate before flagging as late">
              <NumberInput
                value={rules.deliveryTiming.lateDeliveryThresholdMinutes}
                onChange={(v) => update('deliveryTiming', 'lateDeliveryThresholdMinutes', v)}
                min={1}
              />
            </RuleField>
          </div>
        </Card>

        {/* Contract Minimums */}
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Contract Minimums</h2>
            <p className="text-xs text-slate-500 mb-4">Set minimum order values, frequencies, and vendor requirements</p>
            <RuleField label="Minimum Order Amount" description="Minimum total order value required">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">$</span>
                <NumberInput
                  value={rules.contractMinimums.minimumOrderAmountCents / 100}
                  onChange={(v) => update('contractMinimums', 'minimumOrderAmountCents', Math.round(v * 100))}
                  min={0}
                  step={0.5}
                />
              </div>
            </RuleField>
            <RuleField label="Minimum Vendor Sub-Order" description="Minimum value per individual vendor in a split order">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">$</span>
                <NumberInput
                  value={rules.contractMinimums.minimumVendorSubOrderCents / 100}
                  onChange={(v) => update('contractMinimums', 'minimumVendorSubOrderCents', Math.round(v * 100))}
                  min={0}
                  step={0.5}
                />
              </div>
            </RuleField>
            <RuleField label="Minimum Monthly Orders" description="Required orders per month for consumers (0 = no minimum)">
              <NumberInput
                value={rules.contractMinimums.minimumMonthlyOrderCount}
                onChange={(v) => update('contractMinimums', 'minimumMonthlyOrderCount', v)}
                min={0}
              />
            </RuleField>
            <RuleField label="Minimum Weekly Menu Items" description="Minimum active menu items vendors must maintain">
              <NumberInput
                value={rules.contractMinimums.minimumWeeklyMenuItems}
                onChange={(v) => update('contractMinimums', 'minimumWeeklyMenuItems', v)}
                min={0}
              />
            </RuleField>
            <RuleField label="Contract Renewal Period (days)" description="Duration of vendor/consumer contracts in days">
              <NumberInput
                value={rules.contractMinimums.contractRenewalDays}
                onChange={(v) => update('contractMinimums', 'contractRenewalDays', v)}
                min={1}
              />
            </RuleField>
          </div>
        </Card>

        {/* Portion Protocols */}
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Portion Protocols</h2>
            <p className="text-xs text-slate-500 mb-4">Control serving sizes, order limits, and justification requirements</p>
            <RuleField label="Max Portions Per Item" description="Maximum quantity of a single item per order">
              <NumberInput
                value={rules.portionProtocols.maxPortionsPerItem}
                onChange={(v) => update('portionProtocols', 'maxPortionsPerItem', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Max Items Per Order" description="Maximum unique items allowed in a single order">
              <NumberInput
                value={rules.portionProtocols.maxItemsPerOrder}
                onChange={(v) => update('portionProtocols', 'maxItemsPerOrder', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Max Orders Per Day" description="Maximum orders a consumer can place per day">
              <NumberInput
                value={rules.portionProtocols.maxOrdersPerDay}
                onChange={(v) => update('portionProtocols', 'maxOrdersPerDay', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Require Portion Justification" description="Require a note for large portion orders">
              <Toggle
                checked={rules.portionProtocols.requirePortionJustification}
                onChange={(v) => update('portionProtocols', 'requirePortionJustification', v)}
              />
            </RuleField>
            <RuleField label="Justification Threshold" description="Quantity per item that triggers justification requirement">
              <NumberInput
                value={rules.portionProtocols.portionJustificationThreshold}
                onChange={(v) => update('portionProtocols', 'portionJustificationThreshold', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Default Serving Size (oz)" description="Standard serving size for menu items">
              <NumberInput
                value={rules.portionProtocols.defaultServingSizeOz}
                onChange={(v) => update('portionProtocols', 'defaultServingSizeOz', v)}
                min={1}
              />
            </RuleField>
            <RuleField label="Max Serving Size (oz)" description="Maximum allowed serving size">
              <NumberInput
                value={rules.portionProtocols.maxServingSizeOz}
                onChange={(v) => update('portionProtocols', 'maxServingSizeOz', v)}
                min={1}
              />
            </RuleField>
          </div>
        </Card>

        {/* Save button at bottom too */}
        <div className="flex justify-end pb-8">
          <Button onClick={saveRules} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VendorShell } from '@/components/layout/VendorShell';
import { vendorPath } from '@/lib/utils/debug-client';

export default function VendorSettingsPage() {
  const router = useRouter();

  return (
    <VendorShell
      active="settings"
      title="Vendor Settings"
      subtitle="Account and business preferences."
    >
      <div className="max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Settings coming soon</h2>
          <p className="text-slate-500 mb-6">
            For now, use the navigation to manage your kitchen, orders, and menu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push(vendorPath('/vendor/kds'))}>Open KDS</Button>
            <Button variant="secondary" onClick={() => router.push(vendorPath('/vendor/menu'))}>
              Edit Menu
            </Button>
          </div>
        </Card>
      </div>
    </VendorShell>
  );
}

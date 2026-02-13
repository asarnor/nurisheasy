'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';

export default function VendorSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen app-surface">
      <MobileHeader title="Settings" showBack onBack={() => router.back()} />
      <div className="hidden md:block">
        <Header title="Settings" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <Card className="text-center py-12">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Vendor Settings</h1>
          <p className="text-slate-500 mb-6">
            Settings are coming next. For now, you can manage your menu and orders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/vendor/menu')}>Go to Menu</Button>
            <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
              View Orders
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

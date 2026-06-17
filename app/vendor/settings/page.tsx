import { Suspense } from 'react';
import VendorSettingsView from '@/app/(vendor)/settings/VendorSettingsView';

export default function VendorSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen app-surface flex items-center justify-center">
          <p className="text-slate-500">Loading settings...</p>
        </div>
      }
    >
      <VendorSettingsView />
    </Suspense>
  );
}

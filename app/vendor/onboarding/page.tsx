import { Suspense } from 'react';
import VendorOnboardingView from '@/app/(vendor)/onboarding/VendorOnboardingView';

export default function VendorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen app-surface flex items-center justify-center">
          <p className="text-slate-500">Loading onboarding...</p>
        </div>
      }
    >
      <VendorOnboardingView />
    </Suspense>
  );
}

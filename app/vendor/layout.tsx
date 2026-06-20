'use client';

import { VendorOnboardingGate } from '@/components/vendor/VendorOnboardingGate';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <VendorOnboardingGate>{children}</VendorOnboardingGate>;
}

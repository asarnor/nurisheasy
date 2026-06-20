'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils/api';
import { vendorPath } from '@/lib/utils/debug-client';

export function VendorOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith('/vendor/onboarding')) return;

    let cancelled = false;

    const check = async () => {
      try {
        const response = await apiFetch('/api/vendor/onboarding');
        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (!data.status?.isComplete && !cancelled) {
          router.replace(vendorPath('/vendor/onboarding'));
        }
      } catch {
        // Allow access if status check fails (e.g. offline)
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return <>{children}</>;
}

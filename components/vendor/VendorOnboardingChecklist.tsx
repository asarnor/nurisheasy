'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/utils/api';
import { vendorPath } from '@/lib/utils/debug-client';
import type { VendorOnboardingStatus } from '@/lib/vendor-onboarding';

export const VendorOnboardingChecklist: React.FC = () => {
  const pathname = usePathname();
  const [status, setStatus] = useState<VendorOnboardingStatus | null>(null);

  useEffect(() => {
    apiFetch('/api/vendor/onboarding')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => undefined);
  }, []);

  if (pathname.startsWith('/vendor/onboarding')) return null;
  if (!status || status.isComplete) return null;

  const incomplete = status.checklist.filter(
    (item) => !item.complete && item.id !== 'stripe'
  );

  if (!incomplete.length) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">Finish setting up your kitchen</p>
          <p className="text-sm text-amber-800/90">
            {status.progressPercent}% complete — group homes cannot find you until you go live.
          </p>
        </div>
        <Link
          href={vendorPath(`/vendor/onboarding?step=${status.nextStep}`)}
          className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Continue setup
        </Link>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-amber-900/90">
        {incomplete.map((item) => (
          <li key={item.id}>• {item.label}</li>
        ))}
      </ul>
    </Card>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { ConsumerAccountPanel } from '@/components/consumer/ConsumerAccountPanel';
import { apiFetch } from '@/lib/utils/api';

export default function AccountSettingsPage() {
  const [organizationName, setOrganizationName] = useState<string>();

  useEffect(() => {
    apiFetch('/api/organizations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.organization?.name) setOrganizationName(data.organization.name);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ConsumerAccountShell
      active="settings"
      title="Account settings"
      subtitle="Manage your sign-in credentials and personal account."
    >
      <ConsumerAccountPanel organizationName={organizationName} />
    </ConsumerAccountShell>
  );
}

'use client';

import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { ConsumerProfileForm } from '@/components/consumer/ConsumerProfileForm';

export default function AccountProfilePage() {
  return (
    <ConsumerAccountShell
      active="profile"
      title="Profile"
      subtitle="Facility details, dietary restrictions, and delivery address."
    >
      <ConsumerProfileForm />
    </ConsumerAccountShell>
  );
}

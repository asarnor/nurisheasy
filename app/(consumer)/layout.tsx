import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentOrganization, getOrganizationFromMemberships } from '@/lib/utils/clerk';
import { getTestUserRole, isDebugEnvEnabled } from '@/lib/utils/debug';
import { ConsumerOnboardingGate } from '@/components/consumer/ConsumerOnboardingGate';

export default async function ConsumerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const debugRole = await getTestUserRole();

  if (debugRole === 'admin') {
    redirect('/admin/dashboard');
  }

  if (debugRole === 'vendor') {
    redirect('/vendor/kds');
  }

  if (!(debugRole === 'consumer' || isDebugEnvEnabled())) {
    const { userId, orgRole } = await auth();

    if (userId) {
      if (orgRole === 'org:admin') {
        redirect('/admin/dashboard');
      }

      let organization = await getCurrentOrganization();

      if (!organization) {
        const fallback = await getOrganizationFromMemberships();
        if (fallback.orgRole === 'org:admin') {
          redirect('/admin/dashboard');
        }
        organization = fallback.organization || organization;
      }

      if (organization?.type === 'vendor') {
        redirect('/vendor/kds');
      }
    }
  }

  return <ConsumerOnboardingGate>{children}</ConsumerOnboardingGate>;
}

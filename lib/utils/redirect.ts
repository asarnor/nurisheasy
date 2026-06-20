import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getCurrentOrganization, getOrganizationFromMemberships } from './clerk';
import { getTestUserRole } from './debug';

/**
 * Redirect authenticated user to their appropriate dashboard based on role
 */
export async function redirectToRoleDashboard() {
  const { orgRole } = await auth();
  const debugRole = await getTestUserRole();

  if (debugRole === 'admin') {
    redirect('/admin/dashboard');
  }
  if (debugRole === 'vendor') {
    redirect('/vendor/onboarding');
  }
  if (debugRole === 'consumer') {
    redirect('/onboarding');
  }

  let organization = await getCurrentOrganization();

  // Admin check (based on Clerk role)
  if (orgRole === 'org:admin') {
    redirect('/admin/dashboard');
  }

  if (!organization) {
    const fallback = await getOrganizationFromMemberships();
    if (fallback.orgRole === 'org:admin') {
      redirect('/admin/dashboard');
    }
    organization = fallback.organization || organization;
  }

  // Organization type check
  if (organization) {
    if (organization.type === 'vendor') {
      if (!organization.marketplaceVisible && !organization.onboardingCompletedAt) {
        redirect('/vendor/onboarding');
      }
      redirect('/vendor/kds');
    } else if (organization.type === 'consumer') {
      if (!organization.onboardingCompletedAt) {
        redirect('/onboarding');
      }
      redirect('/marketplace');
    }
  }

  // Default fallback
  redirect('/marketplace');
}

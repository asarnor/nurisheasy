import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getCurrentOrganization } from './clerk';

/**
 * Redirect authenticated user to their appropriate dashboard based on role
 */
export async function redirectToRoleDashboard() {
  const { orgRole } = await auth();
  const organization = await getCurrentOrganization();

  // Admin check (based on Clerk role)
  if (orgRole === 'org:admin') {
    redirect('/admin/dashboard');
  }

  // Organization type check
  if (organization) {
    if (organization.type === 'vendor') {
      redirect('/vendor/kds');
    } else if (organization.type === 'consumer') {
      redirect('/marketplace');
    }
  }

  // Default fallback
  redirect('/marketplace');
}

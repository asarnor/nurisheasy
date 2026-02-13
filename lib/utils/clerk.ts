import { auth, currentUser } from '@clerk/nextjs/server';
import Organization from '@/lib/models/organization.model';
import connectDB from '@/lib/mongodb';

/**
 * Get the current user's organization from Clerk and MongoDB
 */
export async function getCurrentOrganization() {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    return null;
  }

  await connectDB();
  
  const organization = await Organization.findOne({ clerkOrgId: orgId });
  return organization;
}

/**
 * Get current user with organization context
 */
export async function getCurrentUserWithOrg() {
  const user = await currentUser();
  const organization = await getCurrentOrganization();
  
  return {
    user,
    organization,
  };
}

/**
 * Attempt to resolve an organization from Clerk memberships when orgId is missing.
 */
export async function getOrganizationFromMemberships() {
  const user = await currentUser();
  const memberships =
    (user as any)?.organizationMemberships?.data ||
    (user as any)?.organizationMemberships ||
    [];

  const membershipList = Array.isArray(memberships) ? memberships : [];
  const preferredMembership =
    membershipList.find((membership) => membership?.role === 'org:admin') ||
    membershipList[0] ||
    null;
  const clerkOrgId = preferredMembership?.organization?.id || null;

  if (!clerkOrgId) {
    return {
      organization: null,
      orgRole: preferredMembership?.role || null,
    };
  }

  await connectDB();
  const organization = await Organization.findOne({ clerkOrgId });

  return {
    organization,
    orgRole: preferredMembership?.role || null,
  };
}

/**
 * Check if user has required role
 */
export async function requireRole(requiredRole: 'consumer' | 'vendor' | 'admin') {
  const organization = await getCurrentOrganization();
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  if (requiredRole === 'admin') {
    // Admin check would be based on Clerk role
    const { orgRole } = await auth();
    if (orgRole !== 'org:admin') {
      throw new Error('Admin access required');
    }
  } else if (organization.type !== requiredRole) {
    throw new Error(`Access denied: ${requiredRole} role required`);
  }
  
  return organization;
}

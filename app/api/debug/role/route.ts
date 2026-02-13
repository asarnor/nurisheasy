import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentOrganization, getOrganizationFromMemberships } from '@/lib/utils/clerk';
import { getTestUserRole } from '@/lib/utils/debug';

export async function GET() {
  try {
    const { userId, orgId, orgRole } = await auth();
    const debugRole = await getTestUserRole();

    let organizationType: string | null = null;
    let organizationId: string | null = null;
    let organizationClerkOrgId: string | null = null;
    let membershipOrgRole: string | null = null;

    if (userId) {
      let organization = await getCurrentOrganization();

      if (!organization) {
        const fallback = await getOrganizationFromMemberships();
        membershipOrgRole = fallback.orgRole || null;
        organization = fallback.organization;
      }

      if (organization) {
        organizationType = organization.type;
        organizationId = organization._id?.toString?.() || organization.id || null;
        organizationClerkOrgId = organization.clerkOrgId || null;
      }
    }

    return NextResponse.json({
      authenticated: !!userId,
      userId: userId || null,
      orgId: orgId || null,
      orgRole: orgRole || null,
      debugRole: debugRole || null,
      membershipOrgRole,
      organizationType,
      organizationId,
      organizationClerkOrgId,
    });
  } catch (error) {
    console.error('Error resolving debug role:', error);
    return NextResponse.json(
      { error: 'Failed to resolve debug role' },
      { status: 500 }
    );
  }
}

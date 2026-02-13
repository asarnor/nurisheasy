import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export type DebugRole = 'consumer' | 'vendor' | 'admin';

const DEBUG_ROLES = new Set<DebugRole>(['consumer', 'vendor', 'admin']);

const TEST_USER_EMAILS: Record<DebugRole, string[]> = {
  consumer: ['consumer@test.com'],
  vendor: ['vendor@test.com'],
  admin: ['admin@test.com'],
};

export const isDebugEnvEnabled = () =>
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || process.env.DEBUG_MODE === 'true';

const normalizeRole = (value?: string | null): DebugRole | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return DEBUG_ROLES.has(normalized as DebugRole)
    ? (normalized as DebugRole)
    : null;
};

export const getTestUserRole = async (): Promise<DebugRole | null> => {
  try {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress;

    if (!email) return null;

    const normalized = email.toLowerCase();

    const match = (Object.entries(TEST_USER_EMAILS) as Array<[DebugRole, string[]]>).find(
      ([, emails]) => emails.includes(normalized)
    );

    return match ? match[0] : null;
  } catch (error) {
    console.warn('Debug user lookup failed:', error);
    return null;
  }
};

export const shouldUseMockData = async (request?: NextRequest): Promise<boolean> => {
  if (isDebugEnvEnabled()) return true;

  if (request?.nextUrl?.searchParams.get('debug') === '1') return true;
  if (request?.headers.get('x-debug-mode') === '1') return true;

  const testRole = await getTestUserRole();
  return !!testRole;
};

export const getDebugRoleFromRequest = async (
  request?: NextRequest
): Promise<DebugRole> => {
  const roleFromQuery = normalizeRole(request?.nextUrl?.searchParams.get('debugRole'));
  const roleFromHeader = normalizeRole(request?.headers.get('x-debug-role'));
  const roleFromCookie = normalizeRole(request?.cookies.get('sp_debug_role')?.value);

  const testRole = await getTestUserRole();

  return roleFromQuery || roleFromHeader || roleFromCookie || testRole || 'consumer';
};

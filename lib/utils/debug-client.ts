export type DebugRole = 'consumer' | 'vendor' | 'admin';

export const isDebugClient = () =>
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const getDebugRoleFromPath = (pathname: string): DebugRole => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/vendor')) return 'vendor';
  return 'consumer';
};

export const withDebugParams = (url: string, role?: DebugRole) => {
  if (!isDebugClient() || typeof window === 'undefined') {
    return url;
  }

  const resolved = new URL(url, window.location.origin);
  const debugRole = role || getDebugRoleFromPath(window.location.pathname);

  resolved.searchParams.set('debug', '1');
  resolved.searchParams.set('debugRole', debugRole);

  return `${resolved.pathname}${resolved.search}`;
};

export const vendorPath = (path: string) =>
  isDebugClient() ? `${path}?debug=1&debugRole=vendor` : path;

export const vendorSettingsPath = (tab?: string) => {
  const base = vendorPath('/vendor/settings');
  if (!tab) return base;
  return `${base}${base.includes('?') ? '&' : '?'}tab=${tab}`;
};

export const consumerPath = (path: string) =>
  isDebugClient() ? `${path}?debug=1&debugRole=consumer` : path;

export const consumerAccountPath = (section?: string) => {
  const base = consumerPath(section ? `/account/${section}` : '/account');
  return base;
};

import type { IInventoryRules } from '@/lib/models/platform-rule.model';

// A minimal, JSON-friendly view of a menu item. `lastVerifiedAt` may arrive as
// a Date (from Mongoose) or an ISO string (from mock data / API responses).
export interface StaleCheckItem {
  lastVerifiedAt?: Date | string | null;
}

export interface StaleCheckRules {
  requireDailyVerification: boolean;
  verificationWindowHours: number;
}

// Coerce active platform inventory rules into the narrow shape used for
// stale-item checks. We default the window to 24h so admins that only flip the
// enforcement flag still get a sane cutoff. Note: `requireDailyVerification`
// defaults to false in DEFAULT_RULES so debug/dev flows stay unaffected; the
// enforcement path below only runs once an admin opts in.
export function toStaleRules(
  inventory: Pick<
    IInventoryRules,
    'requireDailyVerification' | 'verificationWindowHours'
  >
): StaleCheckRules {
  return {
    requireDailyVerification: Boolean(inventory?.requireDailyVerification),
    verificationWindowHours: Math.max(
      1,
      Number(inventory?.verificationWindowHours) || 24
    ),
  };
}

// Returns true when the given menu item is "stale" and should be hidden from
// the marketplace / consumer-facing listings. Vendors keep seeing their stale
// items in their own dashboards so they can re-verify.
export function isMenuItemStale(
  item: StaleCheckItem,
  rules: StaleCheckRules,
  now: Date = new Date()
): boolean {
  if (!rules.requireDailyVerification) return false;
  if (!item.lastVerifiedAt) return true;

  const verified = new Date(item.lastVerifiedAt).getTime();
  if (Number.isNaN(verified)) return true;

  const ageHours = (now.getTime() - verified) / (1000 * 60 * 60);
  return ageHours > rules.verificationWindowHours;
}

// Convenience for the vendor UI badge — always returns hours since
// verification regardless of platform rule state (null if we can't tell).
export function verificationAgeHours(
  item: StaleCheckItem,
  now: Date = new Date()
): number | null {
  if (!item.lastVerifiedAt) return null;
  const verified = new Date(item.lastVerifiedAt).getTime();
  if (Number.isNaN(verified)) return null;
  return (now.getTime() - verified) / (1000 * 60 * 60);
}

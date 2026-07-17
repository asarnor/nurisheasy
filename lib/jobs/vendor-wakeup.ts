import { runVendorAcceptanceJob } from '@/lib/jobs/vendor-acceptance';

/**
 * @deprecated Use `runVendorAcceptanceJob` from `@/lib/jobs/vendor-acceptance`.
 *
 * Retained for backward compatibility with the existing
 * `POST /api/jobs/vendor-wakeup` cron. Delegates to the unified escalation
 * ladder so SMS/voice/expiry all use `vendorSettings.contactPhone` (issue #6).
 */
export async function checkPendingOrders() {
  const result = await runVendorAcceptanceJob();
  console.log('[vendor-wakeup] delegated to vendor-acceptance:', result);
  return result;
}

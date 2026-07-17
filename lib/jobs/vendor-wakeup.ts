import { runVendorAcceptanceJob } from '@/lib/jobs/vendor-acceptance';

/**
 * @deprecated Use `runVendorAcceptanceJob` from `@/lib/jobs/vendor-acceptance`.
 * Retained for backward compatibility with the /api/jobs/vendor-wakeup cron.
 */
export async function checkPendingOrders() {
  const result = await runVendorAcceptanceJob();
  console.log('[vendor-wakeup] delegated to vendor-acceptance:', result);
  return result;
}

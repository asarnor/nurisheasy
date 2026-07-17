import { NextRequest, NextResponse } from 'next/server';
import { runVendorAcceptanceJob } from '@/lib/jobs/vendor-acceptance';
import { shouldUseMockData } from '@/lib/utils/debug';

/**
 * POST /api/jobs/vendor-acceptance
 *
 * Run the vendor acceptance escalation ladder + auto-expire pass. Intended to
 * be invoked by a scheduler every 1–2 minutes.
 *
 * Protected by `CRON_API_KEY` bearer token (same convention as vendor-wakeup)
 * except in debug mode.
 */
export async function POST(request: NextRequest) {
  try {
    const debug = await shouldUseMockData(request);
    const apiKey = process.env.CRON_API_KEY;
    const authHeader = request.headers.get('authorization');

    if (!debug && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (debug) {
      // Mock mode has no persistent Mongo escalation state — return a stub.
      return NextResponse.json({
        success: true,
        debug: true,
        message: 'vendor-acceptance job ran (mock mode: no-op)',
      });
    }

    const result = await runVendorAcceptanceJob();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('vendor-acceptance job error:', error);
    return NextResponse.json(
      { error: 'Job failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

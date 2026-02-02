import { NextRequest, NextResponse } from 'next/server';
import { checkPendingOrders } from '@/lib/jobs/vendor-wakeup';

/**
 * POST /api/jobs/vendor-wakeup
 * Trigger vendor wake-up job (should be called by cron or scheduler)
 * Protected by API key or Railway cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await checkPendingOrders();

    return NextResponse.json({
      success: true,
      message: 'Vendor wake-up job completed',
    });
  } catch (error) {
    console.error('Vendor wake-up job error:', error);
    return NextResponse.json(
      { error: 'Job failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

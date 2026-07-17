import { NextRequest, NextResponse } from 'next/server';
import { generateContractOrders } from '@/lib/jobs/generate-contract-orders';

/**
 * POST /api/jobs/generate-contract-orders
 *
 * Generates a new Order (one delivery) for every ACTIVE Contract whose
 * `preparationDayOfWeek` matches today and that has not yet generated for
 * this prep cycle. Should be invoked by a scheduler (Railway cron, etc.).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateContractOrders();

    return NextResponse.json({
      success: true,
      generatedCount: result.generated.length,
      skippedCount: result.skipped.length,
      generated: result.generated,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('generate-contract-orders job error:', error);
    return NextResponse.json(
      { error: 'Job failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

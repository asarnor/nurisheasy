import { NextRequest, NextResponse } from 'next/server';
import { shouldUseMockData } from '@/lib/utils/debug';
import { resetMockDeliveryDemo } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  try {
    if (!(await shouldUseMockData(request))) {
      return NextResponse.json(
        { error: 'Reset delivery demo is only available in debug mode' },
        { status: 404 }
      );
    }

    const result = resetMockDeliveryDemo();
    if (!result) {
      return NextResponse.json({ error: 'Demo order not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resetting delivery demo:', error);
    return NextResponse.json({ error: 'Failed to reset delivery demo' }, { status: 500 });
  }
}

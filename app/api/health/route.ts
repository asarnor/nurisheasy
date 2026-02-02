import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    // Check MongoDB connection
    await connectDB();
    
    // Check Redis connection
    await getRedisClient();
    
    return NextResponse.json(
      { status: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: (error as Error).message },
      { status: 503 }
    );
  }
}

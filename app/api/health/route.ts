import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getRedisClient } from '@/lib/redis';
import { isServiceConfigured } from '@/lib/utils/env';

export async function GET() {
  try {
    // Check MongoDB connection
    await connectDB();
    
    // Check Redis connection
    await getRedisClient();
    
    return NextResponse.json(
      { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          mongodb: 'connected',
          redis: 'connected',
          twilio: isServiceConfigured.twilio ? 'configured' : 'not configured',
          resend: isServiceConfigured.resend ? 'configured' : 'not configured',
          googleMaps: isServiceConfigured.googleMaps ? 'configured' : 'not configured',
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: (error as Error).message },
      { status: 503 }
    );
  }
}

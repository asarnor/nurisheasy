import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/', // Landing page - allow unauthenticated access
  '/api/webhooks/stripe(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/health(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const debugEnabled =
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' ||
  process.env.DEBUG_MODE === 'true';

function debugMiddleware(req: NextRequest) {
  return NextResponse.next();
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export default function middleware(req: NextRequest) {
  if (debugEnabled && process.env.NODE_ENV !== 'production') {
    return debugMiddleware(req);
  }
  return clerkHandler(req, {} as any);
}

export const config = {
  matcher: [
    // Root path — some Next.js matcher patterns omit `/` unless listed explicitly
    '/',
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

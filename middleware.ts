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

// Check if debug mode is enabled before initializing Clerk
const debugEnabled =
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' ||
  process.env.DEBUG_MODE === 'true';

export default function middleware(req: NextRequest) {
  // In debug mode and development, bypass all auth
  if (debugEnabled && process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // Otherwise use Clerk middleware
  return clerkMiddleware(async (auth, req) => {
    // Allow public routes
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    // Protect all other routes
    const { userId } = await auth();
    
    if (!userId) {
      // Redirect to home page (landing page) instead of directly to sign-in
      // This allows users to choose their role first
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  })(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

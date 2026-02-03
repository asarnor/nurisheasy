'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'consumer';
  
  // Redirect to home page after sign-in
  // Home page will then redirect based on actual organization type
  const getRedirectUrl = () => {
    return '/';
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'vendor':
        return 'Vendor';
      case 'admin':
        return 'Admin';
      case 'consumer':
      default:
        return 'Group Home';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'vendor':
        return 'Sign in to manage your menu and orders';
      case 'admin':
        return 'Sign in to access admin dashboard';
      case 'consumer':
      default:
        return 'Sign in to order food for your facility';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">SafePlate</h1>
          <p className="mt-2 text-sm text-gray-500">{getRoleTitle()}</p>
          <p className="mt-1 text-gray-600">{getRoleDescription()}</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          afterSignInUrl={getRedirectUrl()}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
        />
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

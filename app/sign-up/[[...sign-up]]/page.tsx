'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignUpContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'consumer';
  
  // Redirect to home page after sign-up
  // Home page will then redirect based on actual organization type
  const getRedirectUrl = () => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'vendor':
        return '/vendor/onboarding';
      case 'consumer':
      default:
        return '/onboarding';
    }
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
        return 'Create your vendor account to start accepting orders';
      case 'admin':
        return 'Create an admin account (requires approval)';
      case 'consumer':
      default:
        return 'Create your group home account to start ordering';
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
        <SignUp
          routing="path"
          path="/sign-up"
          afterSignUpUrl={getRedirectUrl()}
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

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}

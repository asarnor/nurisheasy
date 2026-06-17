'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { isDebugClient, vendorSettingsPath } from '@/lib/utils/debug-client';

const DEBUG_VENDOR_ACCOUNT = {
  name: 'Test Vendor',
  email: 'vendor@test.com',
  role: 'Vendor',
  organizationName: "Momma's Whole Foods",
};

interface VendorAccountPanelProps {
  organizationName?: string;
  compact?: boolean;
}

const DebugAccountPanel: React.FC<VendorAccountPanelProps> = ({
  organizationName,
  compact,
}) => {
  const router = useRouter();
  const account = {
    ...DEBUG_VENDOR_ACCOUNT,
    organizationName: organizationName || DEBUG_VENDOR_ACCOUNT.organizationName,
  };

  const handleLogout = () => {
    router.push('/');
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{account.name}</p>
          <p className="text-xs text-slate-500">{account.email}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => router.push(vendorSettingsPath('account'))}>
            Account settings
          </Button>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Debug mode — using a mock vendor account. Password and security settings are
        unavailable until you sign in with Clerk.
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="mt-1 font-medium text-slate-900">{account.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="mt-1 font-medium text-slate-900">{account.email}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Role</dt>
          <dd className="mt-1">
            <Badge variant="info">{account.role}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Organization</dt>
          <dd className="mt-1 font-medium text-slate-900">{account.organizationName}</dd>
        </div>
      </dl>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Session</h3>
        <p className="text-sm text-slate-500 mb-4">
          End your vendor session and return to the SafePlate home page.
        </p>
        <Button variant="secondary" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
};

const ClerkAccountPanel: React.FC<VendorAccountPanelProps> = ({
  organizationName,
  compact,
}) => {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/sign-in?role=vendor' });
  };

  if (!isLoaded) {
    return <p className="text-sm text-slate-500">Loading account...</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">You are not signed in.</p>
        <Button onClick={() => (window.location.href = '/sign-in?role=vendor')}>
          Sign in
        </Button>
      </div>
    );
  }

  const displayName =
    user.fullName || user.firstName || user.username || 'Vendor user';
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    '—';

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-500 truncate">{email}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => openUserProfile()}>
            Account settings
          </Button>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-slate-900">{displayName}</p>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Role</dt>
          <dd className="mt-1">
            <Badge variant="info">Vendor</Badge>
          </dd>
        </div>
        {organizationName && (
          <div>
            <dt className="text-slate-500">Organization</dt>
            <dd className="mt-1 font-medium text-slate-900">{organizationName}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">User ID</dt>
          <dd className="mt-1 font-mono text-xs text-slate-600">{user.id}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last sign-in</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {user.lastSignInAt
              ? new Date(user.lastSignInAt).toLocaleString()
              : '—'}
          </dd>
        </div>
      </dl>

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Security & profile
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Update your password, email, and profile photo through your SafePlate
            account portal.
          </p>
          <Button variant="secondary" onClick={() => openUserProfile()}>
            Manage account
          </Button>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Session</h3>
          <p className="text-sm text-slate-500 mb-4">
            Sign out of this vendor account on this device.
          </p>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
};

export const VendorAccountPanel: React.FC<VendorAccountPanelProps> = (props) => {
  if (isDebugClient()) {
    return <DebugAccountPanel {...props} />;
  }

  return <ClerkAccountPanel {...props} />;
};

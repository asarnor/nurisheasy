'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { CONSUMER_ACCOUNT_NAV } from '@/lib/consumer-account-nav';
import { ConsumerAccountPanel } from '@/components/consumer/ConsumerAccountPanel';
import { ConsumerOnboardingChecklist } from '@/components/consumer/ConsumerOnboardingChecklist';
import { ConsumerBottomNav } from '@/components/layout/ConsumerBottomNav';
import {
  consumerAccountPath,
  consumerPath,
  isDebugClient,
} from '@/lib/utils/debug-client';

export type ConsumerNavId = 'marketplace' | 'orders' | 'cart';

interface ConsumerShellProps {
  title: string;
  subtitle?: string;
  active: ConsumerNavId;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

const primaryNav: {
  id: ConsumerNavId;
  label: string;
  shortLabel: string;
  href: string;
  icon: string;
}[] = [
  { id: 'marketplace', label: 'Marketplace', shortLabel: 'Home', href: '/marketplace', icon: '🏠' },
  { id: 'orders', label: 'Orders', shortLabel: 'Orders', href: '/orders', icon: '📦' },
  { id: 'cart', label: 'Cart', shortLabel: 'Cart', href: '/cart', icon: '🛒' },
];

export const ConsumerShell: React.FC<ConsumerShellProps> = ({
  title,
  subtitle,
  active,
  showBack,
  onBack,
  children,
}) => {
  const pathname = usePathname();
  const debugEnabled = isDebugClient();

  const isPrimaryActive = (item: (typeof primaryNav)[number]) => {
    if (item.id === 'orders') return pathname.startsWith('/orders');
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const isAccountActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen flex app-surface">
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200/70 lg:bg-white/70 lg:backdrop-blur lg:shrink-0">
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-900">Group Home</h2>
                {debugEnabled && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Debug
                  </span>
                )}
              </div>
            </div>
            {!debugEnabled && <UserButton afterSignOutUrl="/sign-in?role=consumer" />}
          </div>

          <nav className="space-y-1 mb-8">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Shop
            </p>
            {primaryNav.map((item) => (
              <Link
                key={item.id}
                href={consumerPath(item.href)}
                className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isPrimaryActive(item) || active === item.id
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <nav className="space-y-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              My account
            </p>
            {CONSUMER_ACCOUNT_NAV.map((item) => (
              <Link
                key={item.id}
                href={consumerAccountPath(item.id)}
                className={`block rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  isAccountActive(item.href)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Signed in as
          </p>
          <ConsumerAccountPanel compact />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="lg:hidden border-b border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {showBack && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-slate-600 hover:text-slate-900"
                  aria-label="Go back"
                >
                  ←
                </button>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">Group Home</h2>
                  {debugEnabled && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Debug
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {debugEnabled && (
                <Link
                  href={consumerAccountPath('settings')}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Account
                </Link>
              )}
              {!debugEnabled && <UserButton afterSignOutUrl="/sign-in?role=consumer" />}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {primaryNav.map((item) => (
              <Link
                key={item.id}
                href={consumerPath(item.href)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                  isPrimaryActive(item) || active === item.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {item.icon} {item.shortLabel}
              </Link>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-4">
            {CONSUMER_ACCOUNT_NAV.map((item) => (
              <Link
                key={item.id}
                href={consumerAccountPath(item.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isAccountActive(item.href)
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {item.icon} {item.shortLabel}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 app-grid animate-fade-up">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm mt-2 text-slate-500">{subtitle}</p>}
          </div>
          <ConsumerOnboardingChecklist />
          {children}
        </main>

        <ConsumerBottomNav active={active} />
      </div>
    </div>
  );
};

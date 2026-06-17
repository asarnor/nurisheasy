'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  CONSUMER_ACCOUNT_NAV,
  type ConsumerAccountNavId,
} from '@/lib/consumer-account-nav';
import { ConsumerAccountPanel } from '@/components/consumer/ConsumerAccountPanel';
import { ConsumerBottomNav } from '@/components/layout/ConsumerBottomNav';
import {
  consumerAccountPath,
  consumerPath,
  isDebugClient,
} from '@/lib/utils/debug-client';

interface ConsumerAccountShellProps {
  title: string;
  subtitle?: string;
  active: ConsumerAccountNavId;
  children: React.ReactNode;
}

export const ConsumerAccountShell: React.FC<ConsumerAccountShellProps> = ({
  title,
  subtitle,
  active,
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const debugEnabled = isDebugClient();

  const isNavActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen flex app-surface">
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200/70 lg:bg-white/70 lg:backdrop-blur">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
              <h2 className="text-2xl font-semibold text-slate-900">My Account</h2>
            </div>
            {!debugEnabled && <UserButton afterSignOutUrl="/sign-in?role=consumer" />}
          </div>

          <Link
            href={consumerPath('/marketplace')}
            className="mb-6 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Back to marketplace
          </Link>

          <nav className="space-y-1">
            {CONSUMER_ACCOUNT_NAV.map((item) => (
              <Link
                key={item.id}
                href={consumerAccountPath(item.id)}
                className={`block rounded-xl px-4 py-3 text-sm transition-colors ${
                  active === item.id || isNavActive(item.href)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500 line-clamp-2">
                  {item.description}
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

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="lg:hidden border-b border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              type="button"
              onClick={() => router.push(consumerPath('/marketplace'))}
              className="text-sm font-semibold text-emerald-700"
            >
              ← Marketplace
            </button>
            <div className="flex items-center gap-2">
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
          <div className="flex gap-2 overflow-x-auto px-4 pb-4">
            {CONSUMER_ACCOUNT_NAV.map((item) => (
              <Link
                key={item.id}
                href={consumerAccountPath(item.id)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${
                  active === item.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {item.icon} {item.shortLabel}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 app-grid animate-fade-up">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm mt-2 text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>

        <ConsumerBottomNav active="account" />
      </div>
    </div>
  );
};

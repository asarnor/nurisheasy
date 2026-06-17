'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { isDebugClient, vendorPath, vendorSettingsPath } from '@/lib/utils/debug-client';
import { VendorAccountPanel } from '@/components/vendor/VendorAccountPanel';

export type VendorNavId = 'kds' | 'orders' | 'menu' | 'quick-edit' | 'reviews' | 'settings';

interface VendorShellProps {
  title: string;
  subtitle?: string;
  active: VendorNavId;
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

const navItems: { id: VendorNavId; label: string; shortLabel: string; href: string; icon: string }[] = [
  { id: 'kds', label: 'Kitchen Display', shortLabel: 'KDS', href: '/vendor/kds', icon: '🍳' },
  { id: 'orders', label: 'Orders', shortLabel: 'Orders', href: '/vendor/orders', icon: '📦' },
  { id: 'menu', label: 'Menu Editor', shortLabel: 'Menu', href: '/vendor/menu', icon: '📋' },
  { id: 'quick-edit', label: 'Stock Toggle', shortLabel: 'Stock', href: '/vendor/menu/quick-edit', icon: '🔁' },
  { id: 'reviews', label: 'Reviews', shortLabel: 'Reviews', href: '/vendor/reviews', icon: '⭐' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', href: '/vendor/settings', icon: '⚙️' },
];

const vendorHref = vendorPath;

export const VendorShell: React.FC<VendorShellProps> = ({
  title,
  subtitle,
  active,
  actions,
  showBack,
  onBack,
  children,
}) => {
  const pathname = usePathname();
  const debugEnabled = isDebugClient();

  const isNavActive = (item: (typeof navItems)[number]) => {
    if (item.id === 'orders') return pathname.startsWith('/vendor/orders');
    if (item.id === 'menu') return pathname === '/vendor/menu';
    if (item.id === 'quick-edit') return pathname.startsWith('/vendor/menu/quick-edit');
    if (item.id === 'reviews') return pathname.startsWith('/vendor/reviews');
    return pathname === item.href || (item.id === 'kds' && pathname === '/vendor');
  };

  return (
    <div className="min-h-screen flex app-surface">
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200/70 lg:bg-white/70 lg:backdrop-blur">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-900">Vendor</h2>
                {debugEnabled && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Debug
                  </span>
                )}
              </div>
            </div>
            {!debugEnabled && <UserButton afterSignOutUrl="/sign-in?role=vendor" />}
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={vendorHref(item.href)}
                className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isNavActive(item)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
                {isNavActive(item) && (
                  <span className="text-xs text-emerald-700">Active</span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Account
          </p>
          <VendorAccountPanel compact />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
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
                  <h2 className="text-xl font-semibold text-slate-900">Vendor</h2>
                  {debugEnabled && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Debug
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {debugEnabled && (
                <Link
                  href={vendorSettingsPath('account')}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Account
                </Link>
              )}
              {!debugEnabled && <UserButton afterSignOutUrl="/sign-in?role=vendor" />}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-4">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={vendorHref(item.href)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                  isNavActive(item)
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
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm mt-2 text-slate-500">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={vendorHref(item.href)}
                className={`flex min-w-0 flex-1 flex-col items-center p-2 ${
                  isNavActive(item) ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate text-[10px] font-medium">{item.shortLabel}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

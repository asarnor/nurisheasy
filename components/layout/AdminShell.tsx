'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { isDebugClient } from '@/lib/utils/debug-client';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  active: 'dashboard' | 'triage' | 'users' | 'platform-rules';
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
  { id: 'triage', label: 'Triage', href: '/admin/triage' },
  { id: 'users', label: 'Users', href: '/admin/users' },
  { id: 'platform-rules', label: 'Platform Rules', href: '/admin/platform-rules' },
];

export const AdminShell: React.FC<AdminShellProps> = ({
  title,
  subtitle,
  active,
  actions,
  children,
}) => {
  const debugEnabled = isDebugClient();

  return (
    <div className="min-h-screen app-surface">
      <div className="flex">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:justify-between lg:border-r lg:border-slate-200/70 lg:bg-white/70 lg:backdrop-blur">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">Admin</h2>
                  {debugEnabled && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Debug
                    </span>
                  )}
                </div>
              </div>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    active === item.id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                  {active === item.id && (
                    <span className="text-xs text-emerald-700">Active</span>
                  )}
                </a>
              ))}
            </nav>
          </div>
          <div className="p-6 text-xs text-slate-400">
            Operational console • Monitor critical workflows
          </div>
        </aside>

        <div className="flex-1">
          <header className="lg:hidden border-b border-slate-200/70 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">SafePlate</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">Admin</h2>
                  {debugEnabled && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Debug
                    </span>
                  )}
                </div>
              </div>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                    active === item.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-8 app-grid animate-fade-up">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
              </div>
              {actions && <div className="flex gap-2">{actions}</div>}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

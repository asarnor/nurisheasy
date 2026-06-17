'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { consumerPath } from '@/lib/utils/debug-client';

export type ConsumerBottomNavId = 'marketplace' | 'orders' | 'cart' | 'account';

interface ConsumerBottomNavProps {
  active: ConsumerBottomNavId;
}

const items: { id: ConsumerBottomNavId; label: string; href: string; icon: string }[] = [
  { id: 'marketplace', label: 'Home', href: '/marketplace', icon: '🏠' },
  { id: 'orders', label: 'Orders', href: '/orders', icon: '📦' },
  { id: 'cart', label: 'Cart', href: '/cart', icon: '🛒' },
  { id: 'account', label: 'Account', href: '/account/profile', icon: '👤' },
];

export const ConsumerBottomNav: React.FC<ConsumerBottomNavProps> = ({ active }) => {
  const pathname = usePathname();

  const isActive = (item: (typeof items)[number]) => {
    if (item.id === 'account') return pathname.startsWith('/account') || pathname === '/profile';
    if (item.id === 'orders') return pathname.startsWith('/orders');
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={consumerPath(item.href)}
            className={`flex min-w-0 flex-1 flex-col items-center p-2 ${
              isActive(item) || active === item.id ? 'text-emerald-600' : 'text-slate-600'
            }`}
          >
            <span className="text-xl" aria-hidden="true">
              {item.icon}
            </span>
            <span className="truncate text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

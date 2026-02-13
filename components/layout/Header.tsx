'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { isDebugClient } from '@/lib/utils/debug-client';

interface HeaderProps {
  title?: string;
  showUserButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'SafePlate',
  showUserButton = true 
}) => {
  const router = useRouter();
  const debugEnabled = isDebugClient();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
            >
              {title}
            </button>
            {debugEnabled && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Debug data
              </span>
            )}
          </div>
          
          {showUserButton && (
            <div className="flex items-center gap-4">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

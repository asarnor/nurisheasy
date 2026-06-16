'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { isDebugClient } from '@/lib/utils/debug-client';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title,
  showBack = false,
  onBack
}) => {
  const router = useRouter();
  const debugEnabled = isDebugClient();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-200/70 md:hidden">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={handleBack}
              className="text-slate-600 hover:text-slate-900"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {debugEnabled && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Debug
            </span>
          )}
        </div>
        {!debugEnabled && (
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        )}
      </div>
    </header>
  );
};

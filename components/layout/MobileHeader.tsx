'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 md:hidden">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
        />
      </div>
    </header>
  );
};

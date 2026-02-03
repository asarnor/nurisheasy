'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  showUserButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'SafePlate',
  showUserButton = true 
}) => {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors"
            >
              {title}
            </button>
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

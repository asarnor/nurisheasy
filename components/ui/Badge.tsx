import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200/80',
    danger: 'bg-rose-100 text-rose-800 border-rose-200/80',
    warning: 'bg-amber-100 text-amber-800 border-amber-200/80',
    info: 'bg-sky-100 text-sky-800 border-sky-200/80',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-[0_22px_50px_-32px_rgba(15,23,42,0.5)]' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

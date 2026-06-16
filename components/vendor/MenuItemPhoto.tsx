'use client';

import React, { useMemo, useState } from 'react';
import {
  isGeneratedImageUrl,
  resolveMenuItemImageUrl,
  type MenuItemImageInput,
} from '@/lib/menu-item-images';

interface MenuItemPhotoProps {
  item: MenuItemImageInput & { _id?: string; id?: string };
  className?: string;
  aspect?: 'square' | 'video';
  showBadge?: boolean;
}

export const MenuItemPhoto: React.FC<MenuItemPhotoProps> = ({
  item,
  className = '',
  aspect = 'video',
  showBadge = true,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const menuId = item._id || item.id;
  const src = useMemo(
    () => resolveMenuItemImageUrl(item, menuId),
    [item, menuId]
  );
  const isGenerated =
    !item.imageUrl?.trim() || isGeneratedImageUrl(item.imageUrl);

  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';
  const hasFixedSize = /\b(h|w)-/.test(className);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 ${
        hasFixedSize ? '' : aspectClass
      } ${className}`}
    >
      {!error ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-200/80" />
          )}
          <img
            src={src}
            alt={item.name}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setError(true);
              setLoaded(true);
            }}
          />
        </>
      ) : (
        <div className="flex h-full min-h-[5rem] items-center justify-center p-3 text-center text-xs text-slate-500">
          {item.name}
        </div>
      )}

      {showBadge && isGenerated && !error && loaded && (
        <span
          className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
          title="Auto-generated from item details"
        >
          AI photo
        </span>
      )}
    </div>
  );
};

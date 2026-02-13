'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface MenuItemCardProps {
  id: string;
  name: string;
  price: number;
  rating?: number;
  imageUrl?: string;
  vendorName: string;
  allergenTags: string[];
  quantity: number;
  onQuantityChange: (id: string, quantity: number) => void;
  onAddToCart: (id: string) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  id,
  name,
  price,
  rating = 0,
  imageUrl,
  vendorName,
  allergenTags,
  quantity,
  onQuantityChange,
  onAddToCart,
}) => {
  const formattedPrice = (price / 100).toFixed(2);

  return (
    <Card className="overflow-hidden group animate-fade-up">
      <div className="relative h-44 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Freshly prepared
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="success" className="bg-emerald-50">Safety Match</Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500">{vendorName}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold text-slate-900">${formattedPrice}</span>
          {rating > 0 && (
            <div className="flex items-center text-sm text-slate-500">
              ⭐ {rating}
            </div>
          )}
        </div>

        {allergenTags.length > 0 && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Contains: {allergenTags.join(', ')}
          </div>
        )}

        {quantity === 0 ? (
          <Button onClick={() => onAddToCart(id)} className="w-full" size="sm">
            Add to Cart
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-xl bg-white/80">
              <button
                onClick={() => onQuantityChange(id, Math.max(0, quantity - 1))}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-l-xl"
              >
                −
              </button>
              <span className="px-4 py-1 text-sm font-semibold text-slate-700">{quantity}</span>
              <button
                onClick={() => onQuantityChange(id, quantity + 1)}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-r-xl"
              >
                +
              </button>
            </div>
            <Button onClick={() => onAddToCart(id)} className="flex-1" size="sm">
              Add Another
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

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
    <Card className="overflow-hidden">
      <div className="relative h-48 bg-gray-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="success">Safety Match</Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-sm text-gray-600 mb-2">{vendorName}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-gray-900">${formattedPrice}</span>
          {rating > 0 && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600">⭐ {rating}</span>
            </div>
          )}
        </div>
        
        {allergenTags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Contains: {allergenTags.join(', ')}</p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => onQuantityChange(id, Math.max(0, quantity - 1))}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100"
            >
              −
            </button>
            <span className="px-4 py-1 text-sm font-medium">{quantity}</span>
            <button
              onClick={() => onQuantityChange(id, quantity + 1)}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100"
            >
              +
            </button>
          </div>
          
          {quantity > 0 && (
            <Button
              onClick={() => onAddToCart(id)}
              className="flex-1"
              size="sm"
            >
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

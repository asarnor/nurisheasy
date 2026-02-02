'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorName: string;
}

interface MultiVendorCartProps {
  items: CartItem[];
  onCheckout: () => void;
  onRemoveItem?: (id: string) => void;
}

export const MultiVendorCart: React.FC<MultiVendorCartProps> = ({
  items,
  onCheckout,
  onRemoveItem,
}) => {
  // Group items by vendor
  const itemsByVendor = items.reduce((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = {
        vendorName: item.vendorName,
        items: [],
      };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; items: CartItem[] }>);

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card className="h-full">
      <h2 className="text-xl font-bold mb-4">Multi-Vendor Cart</h2>
      
      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {Object.entries(itemsByVendor).map(([vendorId, vendorData]) => (
          <div key={vendorId} className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="font-semibold text-gray-700 mb-2">{vendorData.vendorName}</h3>
            <div className="space-y-2">
              {vendorData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-600">
                      Qty: {item.quantity} × ${(item.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total Price</span>
          <span className="text-2xl font-bold">${(totalPrice / 100).toFixed(2)}</span>
        </div>
        <Button
          onClick={onCheckout}
          className="w-full"
          size="lg"
          disabled={items.length === 0}
        >
          Checkout
        </Button>
      </div>
    </Card>
  );
};

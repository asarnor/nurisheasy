'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch } from '@/lib/utils/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorName: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load cart from localStorage or state management
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const handleRemoveItem = (id: string) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const updatedCart = cart.map((item) => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity === 0) {
          return null;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[];
    
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      setLoading(true);
      
      const orderItems = cart.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
      }));

      const response = await apiFetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: orderItems }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await response.json();
      
      // Redirect to Stripe checkout or handle payment
      if (orderData.clientSecret) {
        const stripe = await stripePromise;
        if (stripe) {
          // Handle Stripe payment confirmation
          // This would typically use Stripe Elements or Checkout
          localStorage.removeItem('cart');
          setCart([]);
          router.push(`/orders/${orderData.orderId}`);
        } else {
          localStorage.removeItem('cart');
          setCart([]);
          router.push(`/orders/${orderData.orderId}`);
        }
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Group items by vendor
  const itemsByVendor = cart.reduce((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = {
        vendorName: item.vendorName,
        items: [],
      };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; items: CartItem[] }>);

  return (
    <div className="min-h-screen app-surface">
      {/* Mobile Header */}
      <MobileHeader title="Cart" showBack onBack={() => router.back()} />
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header title="Shopping Cart" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 app-grid animate-fade-up">
        <h1 className="text-3xl font-semibold mb-6 hidden md:block">Shopping Cart</h1>

        {cart.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 mb-4">Your cart is empty</p>
            <Button onClick={() => router.push('/marketplace')}>
              Browse Marketplace
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(itemsByVendor).map(([vendorId, vendorData]) => (
              <Card key={vendorId}>
                <h2 className="text-lg font-semibold mb-4 text-slate-900">{vendorData.vendorName}</h2>
                <div className="space-y-4">
                  {vendorData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 last:border-b-0"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-500">
                          ${(item.price / 100).toFixed(2)} each
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white/80">
                          <button
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-l-xl"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 text-sm font-semibold text-slate-700">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-r-xl"
                          >
                            +
                          </button>
                        </div>
                        
                        <span className="font-semibold w-20 text-right text-slate-900">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </span>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-600 hover:text-rose-800 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* Total and Checkout */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold text-slate-700">Total Price</span>
                <span className="text-3xl font-semibold text-slate-900">${(totalPrice / 100).toFixed(2)}</span>
              </div>
              <Button
                onClick={handlePlaceOrder}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { ContractCheckoutOptions } from '@/components/consumer/ContractCheckoutOptions';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import {
  DEFAULT_CONTRACT_OPTIONS,
  DELIVERY_FEE_CENTS,
  type OrderContractOptions,
} from '@/lib/contract-options';

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
  const [contractOptions, setContractOptions] = useState<OrderContractOptions>(
    DEFAULT_CONTRACT_OPTIONS
  );

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    const savedDefaults = localStorage.getItem('defaultContractOptions');
    if (savedDefaults) {
      try {
        setContractOptions(JSON.parse(savedDefaults));
      } catch {
        // ignore invalid saved defaults
      }
    } else {
      apiFetch('/api/consumer/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.settings?.defaultContractOptions) {
            setContractOptions(data.settings.defaultContractOptions);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const handleRemoveItem = (id: string) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity + delta);
          if (newQuantity === 0) {
            return null;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

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
        body: JSON.stringify({
          items: orderItems,
          contract: contractOptions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await response.json();

      if (orderData.clientSecret) {
        const stripe = await stripePromise;
        if (stripe) {
          localStorage.removeItem('cart');
          setCart([]);
          router.push(consumerPath(`/orders/${orderData.orderId}`));
        } else {
          localStorage.removeItem('cart');
          setCart([]);
          router.push(consumerPath(`/orders/${orderData.orderId}`));
        }
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee =
    contractOptions.fulfillmentMethod === 'delivery' ? DELIVERY_FEE_CENTS : 0;
  const totalPrice = subtotal + deliveryFee;

  const itemsByVendor = cart.reduce(
    (acc, item) => {
      if (!acc[item.vendorId]) {
        acc[item.vendorId] = {
          vendorName: item.vendorName,
          items: [],
        };
      }
      acc[item.vendorId].items.push(item);
      return acc;
    },
    {} as Record<string, { vendorName: string; items: CartItem[] }>
  );

  return (
    <ConsumerShell
      active="cart"
      title="Shopping cart"
      subtitle="Review items, set contract terms, and place your order."
      showBack
      onBack={() => router.push(consumerPath('/marketplace'))}
    >
      <div className="max-w-4xl">
        {cart.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 mb-4">Your cart is empty</p>
            <Button onClick={() => router.push(consumerPath('/marketplace'))}>
              Browse marketplace
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <ContractCheckoutOptions
              value={contractOptions}
              onChange={setContractOptions}
            />

            {Object.entries(itemsByVendor).map(([vendorId, vendorData]) => (
              <Card key={vendorId}>
                <h2 className="text-lg font-semibold mb-4 text-slate-900">
                  {vendorData.vendorName}
                </h2>
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

            <Card>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Food subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Delivery fee</span>
                    <span>${(deliveryFee / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-xl font-semibold text-slate-700">Total</span>
                  <span className="text-3xl font-semibold text-slate-900">
                    ${(totalPrice / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                onClick={handlePlaceOrder}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place contractual order'}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </ConsumerShell>
  );
}

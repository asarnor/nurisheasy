'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { ContractCartSummary } from '@/components/consumer/ContractCartSummary';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import {
  formatCartLineSchedule,
  getCheckoutTotals,
  groupCartItemsForCheckout,
  parseStoredCart,
  type ConsumerCartItem,
} from '@/lib/consumer-cart';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<ConsumerCartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCart(parseStoredCart(localStorage.getItem('cart')));
  }, []);

  const checkoutGroups = useMemo(() => groupCartItemsForCheckout(cart), [cart]);
  const totals = useMemo(() => getCheckoutTotals(checkoutGroups), [checkoutGroups]);

  const persistCart = (nextCart: ConsumerCartItem[]) => {
    setCart(nextCart);
    localStorage.setItem('cart', JSON.stringify(nextCart));
  };

  const handleRemoveItem = (lineId: string) => {
    persistCart(cart.filter((item) => item.lineId !== lineId));
  };

  const handleQuantityChange = (lineId: string, delta: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.lineId !== lineId) return item;
        const nextQuantity = item.quantity + delta;
        if (nextQuantity <= 0) return null;
        return { ...item, quantity: nextQuantity };
      })
      .filter(Boolean) as ConsumerCartItem[];

    persistCart(updatedCart);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      setLoading(true);
      const createdOrders: string[] = [];

      for (const group of checkoutGroups) {
        const response = await apiFetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: group.items,
            contract: group.contract,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create order');
        }

        const orderData = await response.json();
        createdOrders.push(orderData.orderId);
      }

      if (createdOrders.length > 0) {
        const stripe = await stripePromise;
        if (stripe) {
          localStorage.removeItem('cart');
          setCart([]);
        } else {
          localStorage.removeItem('cart');
          setCart([]);
        }

        router.push(
          consumerPath(
            createdOrders.length === 1
              ? `/orders/${createdOrders[0]}`
              : '/orders'
          )
        );
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

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
    {} as Record<string, { vendorName: string; items: ConsumerCartItem[] }>
  );

  return (
    <ConsumerShell
      active="cart"
      title="Shopping cart"
      subtitle="Review each dish schedule, then place your contractual orders."
      showBack
      onBack={() => router.push(consumerPath('/marketplace'))}
    >
      <div className="max-w-5xl space-y-6">
        {cart.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="mb-4 text-slate-500">Your cart is empty</p>
            <Button onClick={() => router.push(consumerPath('/marketplace'))}>
              Browse marketplace
            </Button>
          </Card>
        ) : (
          <>
            <ContractCartSummary cart={cart} />

            {Object.entries(itemsByVendor).map(([vendorId, vendorData]) => (
              <Card key={vendorId}>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  {vendorData.vendorName}
                </h2>
                <div className="space-y-4">
                  {vendorData.items.map((item) => (
                    <div
                      key={item.lineId}
                      className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 last:border-b-0 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatCartLineSchedule(item)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          ${(item.price / 100).toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-white/80">
                          <button
                            onClick={() => handleQuantityChange(item.lineId, -1)}
                            className="rounded-l-xl px-3 py-1 text-slate-600 hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 text-sm font-semibold text-slate-700">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.lineId, 1)}
                            className="rounded-r-xl px-3 py-1 text-slate-600 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        <span className="w-20 text-right font-semibold text-slate-900">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </span>

                        <button
                          onClick={() => handleRemoveItem(item.lineId)}
                          className="ml-2 text-rose-600 hover:text-rose-800"
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
              <div className="mb-6 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Food subtotal</span>
                  <span>${(totals.subtotalCents / 100).toFixed(2)}</span>
                </div>
                {totals.deliveryFeeCents > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Delivery fees ({checkoutGroups.length} order{checkoutGroups.length === 1 ? '' : 's'})</span>
                    <span>${(totals.deliveryFeeCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xl font-semibold text-slate-700">Estimated total</span>
                  <span className="text-3xl font-semibold text-slate-900">
                    ${(totals.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                onClick={handlePlaceOrder}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : `Place ${checkoutGroups.length} contractual order${checkoutGroups.length === 1 ? '' : 's'}`}
              </Button>
            </Card>
          </>
        )}
      </div>
    </ConsumerShell>
  );
}

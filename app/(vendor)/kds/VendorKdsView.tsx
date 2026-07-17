'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/utils/api';
import { vendorPath } from '@/lib/utils/debug-client';
import { VendorShell } from '@/components/layout/VendorShell';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface SubOrder {
  vendorId: string;
  status: string;
  items: OrderItem[];
  vendorTotal: number;
  orderId: string;
  consumerName: string;
  allergenAlerts?: string[];
  createdAt?: string;
}

type ColumnKey = 'new' | 'prep' | 'ready';

type DeclineReason = 'out_of_stock' | 'closed' | 'capacity' | 'other';

const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'closed', label: 'Kitchen closed' },
  { value: 'capacity', label: 'At capacity' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_ACCEPTANCE_TIMEOUT_MINUTES = 30;

const statusLabelMap: Record<string, string> = {
  PENDING: 'New Order',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const columnConfig: Record<
  ColumnKey,
  {
    title: string;
    emptyLabel: string;
    badge: 'warning' | 'info' | 'success';
    accent: string;
    panel: string;
    header: string;
  }
> = {
  new: {
    title: 'New Orders',
    emptyLabel: 'No new orders',
    badge: 'warning',
    accent: 'border-l-amber-500',
    panel: 'bg-amber-50/60 border-amber-100',
    header: 'text-amber-900',
  },
  prep: {
    title: 'To Prep',
    emptyLabel: 'No orders to prep',
    badge: 'info',
    accent: 'border-l-sky-500',
    panel: 'bg-sky-50/60 border-sky-100',
    header: 'text-sky-900',
  },
  ready: {
    title: 'Ready',
    emptyLabel: 'No orders ready',
    badge: 'success',
    accent: 'border-l-emerald-500',
    panel: 'bg-emerald-50/60 border-emerald-100',
    header: 'text-emerald-900',
  },
};

// Small dependency-free beep using WebAudio. Falls back silently on browsers
// that block audio without a user gesture (Chrome autoplay policy).
function playBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close?.(), 400);
  } catch (error) {
    console.warn('KDS beep failed:', error);
  }
}

function useNowTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function KitchenDisplaySystemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === '1';
  const [newOrders, setNewOrders] = useState<SubOrder[]>([]);
  const [toPrep, setToPrep] = useState<SubOrder[]>([]);
  const [ready, setReady] = useState<SubOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [acceptanceTimeoutMinutes, setAcceptanceTimeoutMinutes] = useState<number>(
    DEFAULT_ACCEPTANCE_TIMEOUT_MINUTES
  );

  const now = useNowTick(1000);

  // Track pending order IDs across polls so we can play a sound only for
  // *newly seen* pending orders.
  const seenPendingRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const vendorOrders = data.orders || [];

        if (typeof data?.vendor?.kdsSoundEnabled === 'boolean') {
          setSoundEnabled(data.vendor.kdsSoundEnabled);
        }
        if (typeof data?.platformRules?.vendorAcceptanceTimeoutMinutes === 'number') {
          setAcceptanceTimeoutMinutes(
            data.platformRules.vendorAcceptanceTimeoutMinutes
          );
        }

        const newOrdersList: SubOrder[] = [];
        const toPrepList: SubOrder[] = [];
        const readyList: SubOrder[] = [];

        vendorOrders.forEach((order: any) => {
          const subOrder = order.subOrders?.[0];

          if (subOrder) {
            const subOrderData: SubOrder = {
              ...subOrder,
              orderId: order._id,
              vendorId:
                typeof subOrder.vendorId === 'object'
                  ? subOrder.vendorId?._id || subOrder.vendorId?.id || ''
                  : subOrder.vendorId,
              consumerName:
                order.consumerId?.name || order.consumerName || 'Unknown',
              createdAt: order.createdAt,
            };

            if (subOrder.status === 'PENDING') {
              newOrdersList.push(subOrderData);
            } else if (
              subOrder.status === 'ACCEPTED' ||
              subOrder.status === 'PREPARING'
            ) {
              toPrepList.push(subOrderData);
            } else if (subOrder.status === 'READY') {
              readyList.push(subOrderData);
            }
          }
        });

        // Ring the KDS bell for newly-seen PENDING orders (skip the first poll
        // to avoid a stampede of beeps when the page loads).
        const currentIds = new Set(newOrdersList.map((o) => o.orderId));
        if (bootstrappedRef.current && soundEnabled) {
          for (const id of currentIds) {
            if (!seenPendingRef.current.has(id)) {
              playBeep();
              break;
            }
          }
        }
        seenPendingRef.current = currentIds;
        bootstrappedRef.current = true;

        setNewOrders(newOrdersList);
        setToPrep(toPrepList);
        setReady(readyList);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchOrders();
      } else {
        alert('Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order');
    }
  };

  const handleDecline = async (orderId: string) => {
    const reasonPrompt = window.prompt(
      `Decline reason:\n${DECLINE_REASONS.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}\n\nEnter 1-${DECLINE_REASONS.length}:`,
      '1'
    );
    if (!reasonPrompt) return;
    const index = parseInt(reasonPrompt, 10) - 1;
    const reason = DECLINE_REASONS[index]?.value;
    if (!reason) {
      alert('Invalid decline reason');
      return;
    }
    const note = window.prompt('Optional note (visible to consumer):', '') || undefined;

    try {
      const response = await apiFetch(`/api/orders/${orderId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Failed to decline order');
        return;
      }
      fetchOrders();
    } catch (error) {
      console.error('Error declining order:', error);
      alert('Failed to decline order');
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    vendorId?: string
  ) => {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, vendorId }),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          console.log('Status update not permitted.');
          return;
        }
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    }
    fetchOrders();
  };

  const OrderCard = ({
    order,
    accent,
  }: {
    order: SubOrder;
    accent: string;
  }) => {
    const hasAllergenAlerts = order.allergenAlerts && order.allergenAlerts.length > 0;

    // Countdown for PENDING orders (createdAt + timeout - now)
    let countdownMs: number | null = null;
    if (order.status === 'PENDING' && order.createdAt) {
      const deadline =
        new Date(order.createdAt).getTime() +
        acceptanceTimeoutMinutes * 60_000;
      countdownMs = deadline - now;
    }
    const countdownExpired = countdownMs !== null && countdownMs <= 0;

    return (
      <Card className={`border-l-4 ${accent} bg-white shadow-sm`}>
        {hasAllergenAlerts && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-sm font-semibold text-rose-800">Allergy alert</p>
            <p className="text-xs text-rose-700">
              {order.allergenAlerts?.join(', ')}
            </p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">
              {statusLabelMap[order.status] || 'Order Update'}
            </h3>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              #{order.orderId.slice(-8)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{order.consumerName}</p>
          {countdownMs !== null && (
            <div
              className={`mt-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-mono font-semibold ${
                countdownExpired
                  ? 'bg-rose-100 text-rose-800'
                  : countdownMs < 5 * 60_000
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
              }`}
              aria-label="Time remaining to accept"
              data-testid="kds-countdown"
            >
              <span aria-hidden>⏱</span>
              {countdownExpired ? 'EXPIRED' : formatRemaining(countdownMs)}
            </div>
          )}
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Items
          </h4>
          <ul className="space-y-1.5">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm text-slate-700"
              >
                <span>
                  {item.name}{' '}
                  <span className="text-slate-400">× {item.quantity}</span>
                </span>
                <span className="font-medium text-slate-900">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm text-slate-500">Order total</span>
          <span className="text-lg font-semibold text-slate-900">
            ${(order.vendorTotal / 100).toFixed(2)}
          </span>
        </div>

        {order.status === 'PENDING' && (
          <div className="flex gap-2">
            <Button onClick={() => handleAccept(order.orderId)} className="flex-1">
              Accept
            </Button>
            <Button
              onClick={() => handleDecline(order.orderId)}
              className="flex-1"
              variant="danger"
            >
              Decline
            </Button>
          </div>
        )}

        {order.status === 'ACCEPTED' && (
          <Button
            onClick={() => handleStatusChange(order.orderId, 'PREPARING', order.vendorId)}
            className="w-full"
          >
            Start Preparing
          </Button>
        )}

        {order.status === 'PREPARING' && (
          <Button
            onClick={() => handleStatusChange(order.orderId, 'READY', order.vendorId)}
            className="w-full"
          >
            Mark Ready
          </Button>
        )}

        {order.status === 'READY' && (
          <Button
            onClick={() => handleStatusChange(order.orderId, 'DELIVERED', order.vendorId)}
            className="w-full"
            variant="secondary"
          >
            Mark Delivered
          </Button>
        )}
      </Card>
    );
  };

  const columns: { key: ColumnKey; orders: SubOrder[] }[] = [
    { key: 'new', orders: newOrders },
    { key: 'prep', orders: toPrep },
    { key: 'ready', orders: ready },
  ];

  return (
    <VendorShell
      active="kds"
      title="Kitchen Display System"
      subtitle="Live queue and allergy alerts"
    >
      <div className="max-w-7xl mx-auto">
        {showWelcome && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-emerald-900">
                  You&apos;re live on SafePlate
                </h2>
                <p className="mt-1 text-sm text-emerald-800">
                  Your kitchen is now visible to group homes. New orders will appear here in real
                  time. Connect Stripe in Settings when you&apos;re ready to receive payouts.
                </p>
              </div>
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => router.replace(vendorPath('/vendor/kds'))}
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Auto-expire after {acceptanceTimeoutMinutes} min • Sound{' '}
            <span className={soundEnabled ? 'text-emerald-700' : 'text-slate-400'}>
              {soundEnabled ? 'on' : 'off'}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {columns.map(({ key, orders }) => {
            const config = columnConfig[key];

            return (
              <section
                key={key}
                className={`rounded-2xl border p-4 ${config.panel}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={`text-lg font-semibold ${config.header}`}>
                    {config.title}
                  </h2>
                  <Badge variant={config.badge}>{orders.length}</Badge>
                </div>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center">
                      <p className="text-sm text-slate-500">{config.emptyLabel}</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <OrderCard
                        key={order.orderId}
                        order={order}
                        accent={config.accent}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </VendorShell>
  );
}

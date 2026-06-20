'use client';

import React, { useState, useEffect } from 'react';
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
}

type ColumnKey = 'new' | 'prep' | 'ready';

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

export default function KitchenDisplaySystemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === '1';
  const [newOrders, setNewOrders] = useState<SubOrder[]>([]);
  const [toPrep, setToPrep] = useState<SubOrder[]>([]);
  const [ready, setReady] = useState<SubOrder[]>([]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const vendorOrders = data.orders || [];

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
              consumerName: order.consumerId?.name || order.consumerName || 'Unknown',
            };

            if (subOrder.status === 'PENDING') {
              newOrdersList.push(subOrderData);
            } else if (subOrder.status === 'ACCEPTED' || subOrder.status === 'PREPARING') {
              toPrepList.push(subOrderData);
            } else if (subOrder.status === 'READY') {
              readyList.push(subOrderData);
            }
          }
        });

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

  const handleReject = async (orderId: string, vendorId?: string) => {
    if (!confirm('Are you sure you want to reject this order?')) {
      return;
    }
    await handleStatusChange(orderId, 'CANCELLED', vendorId);
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
          console.log('Status updates are unavailable outside debug mode.');
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
              onClick={() => handleReject(order.orderId, order.vendorId)}
              className="flex-1"
              variant="danger"
            >
              Reject
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
};

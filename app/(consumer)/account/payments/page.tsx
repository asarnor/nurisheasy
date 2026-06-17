'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { apiFetch } from '@/lib/utils/api';

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  deliveryFeeCents?: number;
  createdAt: string;
  paymentIntentId?: string;
}

export default function AccountPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/orders')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrders(data?.orders || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConsumerAccountShell
      active="payments"
      title="Payments"
      subtitle="Billing history and payment methods for your facility."
    >
      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold mb-2">Payment methods</h2>
          <p className="text-sm text-slate-500 mb-4">
            Saved cards are managed securely through Stripe at checkout. Saved payment
            method management will be available in a future update.
          </p>
          <Badge variant="info">Stripe checkout</Badge>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Billing history</h2>
          {loading ? (
            <p className="text-slate-500">Loading payments...</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-500">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      Order #{order._id.slice(-8)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                    {order.paymentIntentId && (
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {order.paymentIntentId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      ${(order.totalAmount / 100).toFixed(2)}
                    </p>
                    <Badge variant={order.status === 'REFUNDED' ? 'danger' : 'success'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ConsumerAccountShell>
  );
}

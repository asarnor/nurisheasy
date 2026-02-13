'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';
import { apiFetch } from '@/lib/utils/api';

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
}

interface SubOrder {
  vendorId: string | { _id?: string; name?: string };
  status: string;
  items: OrderItem[];
  vendorTotal: number;
  allergenAlerts?: string[];
}

interface Order {
  _id: string;
  createdAt: string;
  status: string;
  consumerId?: { name?: string };
  consumerName?: string;
  totalAmount?: number;
  subOrders: SubOrder[];
}

const getVendorSubOrder = (order: Order | null) => {
  if (!order?.subOrders?.length) return null;
  return (
    order.subOrders.find((subOrder) => subOrder.vendorId) || order.subOrders[0]
  );
};

const getStatusBadge = (status?: string) => {
  const statusMap: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
    PENDING: { variant: 'warning', label: 'New Order' },
    ACCEPTED: { variant: 'info', label: 'Accepted' },
    PREPARING: { variant: 'info', label: 'Preparing' },
    READY: { variant: 'success', label: 'Ready' },
    DELIVERED: { variant: 'success', label: 'Delivered' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  };

  const statusInfo = statusMap[status || ''] || { variant: 'info' as const, label: status || 'Unknown' };
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
};

export default function VendorOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const match = (data.orders || []).find((item: Order) => item._id === orderId);
        setOrder(match || null);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const vendorSubOrder = getVendorSubOrder(order);
  const vendorTotal =
    vendorSubOrder?.vendorTotal ??
    (order?.totalAmount ?? 0);

  return (
    <div className="min-h-screen app-surface">
      <MobileHeader title="Order Details" showBack onBack={() => router.back()} />
      <div className="hidden md:block">
        <Header title="Order Details" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Order Details</h1>
            {orderId && (
              <p className="text-sm text-slate-500 mt-2">Order #{String(orderId).slice(-8)}</p>
            )}
          </div>
          <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
            Back to Orders
          </Button>
        </div>

        {loading ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">Loading order...</p>
          </Card>
        ) : !order ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">Order not found.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Placed</p>
                  <p className="text-base font-semibold text-slate-900">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Status</span>
                  {getStatusBadge(vendorSubOrder?.status || order.status)}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-3">Customer</h2>
              <p className="text-slate-700">
                {order.consumerId?.name || order.consumerName || 'Unknown'}
              </p>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-3">Items</h2>
              <div className="space-y-3">
                {(vendorSubOrder?.items || []).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    {item.price !== undefined && (
                      <p className="font-medium text-slate-700">
                        ${(item.price / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {vendorSubOrder?.allergenAlerts?.length ? (
              <Card className="border-rose-200 bg-rose-50">
                <h2 className="text-lg font-semibold text-rose-800 mb-3">Allergen Alerts</h2>
                <div className="flex flex-wrap gap-2">
                  {vendorSubOrder.allergenAlerts.map((alert) => (
                    <Badge key={alert} variant="danger">
                      {alert}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Total</h2>
                <p className="text-xl font-semibold text-slate-900">
                  ${(vendorTotal / 100).toFixed(2)}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

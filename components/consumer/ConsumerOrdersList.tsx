'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  subOrders: Array<{ vendorName: string; status: string }>;
  createdAt: string;
}

export const ConsumerOrdersList: React.FC = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }
    > = {
      PROCESSING: { variant: 'warning', label: 'Processing' },
      CONFIRMED: { variant: 'success', label: 'Confirmed' },
      FULFILLED: { variant: 'success', label: 'Fulfilled' },
      CANCELLED: { variant: 'danger', label: 'Cancelled' },
      REFUNDED: { variant: 'danger', label: 'Refunded' },
    };

    const statusInfo = statusMap[status] || { variant: 'info' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return <p className="text-slate-500">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-500 mb-4">No orders yet</p>
        <button
          type="button"
          onClick={() => router.push(consumerPath('/marketplace'))}
          className="text-emerald-600 hover:text-emerald-700 font-semibold"
        >
          Browse marketplace
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card
          key={order._id}
          onClick={() => router.push(consumerPath(`/orders/${order._id}`))}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold">Order #{order._id.slice(-8)}</h3>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-sm text-slate-500 mb-2">
                {new Date(order.createdAt).toLocaleString()}
              </p>
              <div className="text-sm text-slate-500">
                {order.subOrders.length} vendor{order.subOrders.length !== 1 ? 's' : ''} • $
                {(order.totalAmount / 100).toFixed(2)}
              </div>
            </div>
            <div className="text-slate-400">›</div>
          </div>
        </Card>
      ))}
    </div>
  );
};

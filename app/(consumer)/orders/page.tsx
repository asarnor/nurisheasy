'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';
import { apiFetch } from '@/lib/utils/api';

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  subOrders: Array<{
    vendorName: string;
    status: string;
  }>;
  createdAt: string;
}

export default function OrdersPage() {
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
    const statusMap: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
      PROCESSING: { variant: 'warning', label: 'Processing' },
      CONFIRMED: { variant: 'success', label: 'Confirmed' },
      FULFILLED: { variant: 'success', label: 'Fulfilled' },
      CANCELLED: { variant: 'danger', label: 'Cancelled' },
      REFUNDED: { variant: 'danger', label: 'Refunded' },
    };

    const statusInfo = statusMap[status] || { variant: 'info' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="min-h-screen app-surface">
      {/* Mobile Header */}
      <MobileHeader title="Orders" />
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header title="My Orders" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <h1 className="text-3xl font-semibold mb-6 hidden md:block">My Orders</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 mb-4">No orders yet</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Browse Marketplace
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order._id}
                onClick={() => router.push(`/orders/${order._id}`)}
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
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/marketplace')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex flex-col items-center p-2 text-emerald-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">👤</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

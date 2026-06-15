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
  createdAt: string;
  subOrders: Array<{
    vendorId: string | { _id?: string; name?: string };
    status: string;
    items: Array<{ name: string; quantity: number }>;
    vendorTotal: number;
  }>;
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        // Filter orders for this vendor
        const vendorOrders = (data.orders || []).filter((order: Order) =>
          order.subOrders.some((so) => so.vendorId) // This would match vendor ID
        );
        
        if (activeTab === 'active') {
          setOrders(
            vendorOrders.filter(
              (order: Order) =>
                order.status !== 'FULFILLED' && order.status !== 'CANCELLED'
            )
          );
        } else {
          setOrders(
            vendorOrders.filter(
              (order: Order) =>
                order.status === 'FULFILLED' || order.status === 'CANCELLED'
            )
          );
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
      PENDING: { variant: 'warning', label: 'New Order' },
      ACCEPTED: { variant: 'info', label: 'Accepted' },
      PREPARING: { variant: 'info', label: 'Preparing' },
      READY: { variant: 'success', label: 'Ready' },
      DELIVERED: { variant: 'success', label: 'Delivered' },
      CANCELLED: { variant: 'danger', label: 'Cancelled' },
    };

    const statusInfo = statusMap[status] || { variant: 'info' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getVendorSubOrder = (order: Order) =>
    order.subOrders.find((subOrder) => subOrder.vendorId) || order.subOrders[0];

  return (
    <div className="min-h-screen app-surface">
      {/* Mobile Header */}
      <MobileHeader title="Orders" />
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header title="Order Management" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 app-grid animate-fade-up">
        <h1 className="text-3xl font-semibold mb-6 hidden md:block">Order Management</h1>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'active'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'archived'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500">No {activeTab} orders</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const vendorSubOrder = getVendorSubOrder(order);
              
              return (
                <Card
                  key={order._id}
                  onClick={() => router.push(`/vendor/orders/${order._id}`)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">Order #{order._id.slice(-8)}</h3>
                        {getStatusBadge(vendorSubOrder?.status || order.status)}
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <div className="text-sm text-slate-500">
                        {vendorSubOrder?.items.length || 0} items • $
                        {((vendorSubOrder?.vendorTotal || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-slate-400">›</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/vendor/orders')}
            className="flex flex-col items-center p-2 text-emerald-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/vendor/menu')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs">Menu</span>
          </button>
          <button
            onClick={() => router.push('/vendor/settings')}
            className="flex flex-col items-center p-2 text-slate-600"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

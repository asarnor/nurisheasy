'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Order {
  _id: string;
  status: string;
  createdAt: string;
  subOrders: Array<{
    vendorId: string;
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
      const response = await fetch('/api/orders');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 md:hidden">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Orders</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 hidden md:block">Order Management</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'active'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'archived'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Archived
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500">No {activeTab} orders</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const vendorSubOrder = order.subOrders.find((so) => so.vendorId);
              
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
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <div className="text-sm text-gray-600">
                        {vendorSubOrder?.items.length || 0} items • $
                        {((vendorSubOrder?.vendorTotal || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-gray-400">›</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/vendor/orders')}
            className="flex flex-col items-center p-2 text-green-600"
          >
            <span className="text-2xl">📦</span>
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/vendor/menu')}
            className="flex flex-col items-center p-2 text-gray-600"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs">Menu</span>
          </button>
          <button
            onClick={() => router.push('/vendor/settings')}
            className="flex flex-col items-center p-2 text-gray-600"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

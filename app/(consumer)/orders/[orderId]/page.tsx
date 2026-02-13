'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/utils/api';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Header } from '@/components/layout/Header';

interface SubOrder {
  vendorId: string | { _id?: string; name?: string };
  vendorName?: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  vendorTotal: number;
  acceptedAt?: string;
  estimatedReadyAt?: string;
}

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  subOrders: SubOrder[];
  createdAt: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await apiFetch(`/api/orders?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        const foundOrder = data.orders?.find((o: Order) => o._id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'PREPARING':
      case 'READY':
      case 'DELIVERED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REFUNDED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'info';
    }
  };

  const getStatusTimeline = (subOrder: SubOrder) => {
    const statuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
    const currentIndex = statuses.indexOf(subOrder.status);
    
    return statuses.map((status, index) => ({
      status,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  const getVendorName = (subOrder: SubOrder) => {
    if (subOrder.vendorName) return subOrder.vendorName;
    if (typeof subOrder.vendorId === 'object' && subOrder.vendorId?.name) {
      return subOrder.vendorId.name;
    }
    return 'Vendor';
  };

  if (loading) {
    return (
      <div className="min-h-screen app-surface flex items-center justify-center">
        <p className="text-slate-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen app-surface flex items-center justify-center">
        <Card className="text-center py-12">
          <p className="text-slate-500 mb-4">Order not found</p>
          <button
            onClick={() => router.push('/orders')}
            className="text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            View All Orders
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-surface">
      <MobileHeader title="Order Details" showBack onBack={() => router.back()} />
      <div className="hidden md:block">
        <Header title="Order Details" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 app-grid animate-fade-up">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Order #{orderId.slice(-8)}</h1>
          <p className="text-slate-500 mt-2">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="space-y-6">
          {order.subOrders.map((subOrder, index) => {
            const timeline = getStatusTimeline(subOrder);
            
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{getVendorName(subOrder)}</h2>
                  <Badge variant={getStatusColor(subOrder.status) as any}>
                    {subOrder.status}
                  </Badge>
                </div>

                {/* Status Timeline */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    {timeline.map((step, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          } ${step.current ? 'ring-2 ring-emerald-500' : ''}`}
                        >
                          {step.completed ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center ${
                            step.completed ? 'text-emerald-600 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-medium mb-3">Items:</h3>
                  <div className="space-y-2">
                    {subOrder.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-semibold">
                    <span>Subtotal:</span>
                    <span>${(subOrder.vendorTotal / 100).toFixed(2)}</span>
                  </div>
                </div>

                {subOrder.acceptedAt && (
                  <p className="text-sm text-slate-500 mt-4">
                    Accepted at: {new Date(subOrder.acceptedAt).toLocaleString()}
                  </p>
                )}
              </Card>
            );
          })}

          {/* Order Total */}
          <Card className="p-6 bg-slate-50/70">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">Order Total</span>
              <span className="text-3xl font-semibold">
                ${(order.totalAmount / 100).toFixed(2)}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

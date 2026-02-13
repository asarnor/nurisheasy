'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserButton } from '@clerk/nextjs';
import { apiFetch } from '@/lib/utils/api';

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

export default function KitchenDisplaySystemPage() {
  const [newOrders, setNewOrders] = useState<SubOrder[]>([]);
  const [toPrep, setToPrep] = useState<SubOrder[]>([]);
  const [ready, setReady] = useState<SubOrder[]>([]);

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const vendorOrders = data.orders || [];
        
        // Filter and categorize orders
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

  const OrderCard = ({ order }: { order: SubOrder }) => {
    const hasAllergenAlerts = order.allergenAlerts && order.allergenAlerts.length > 0;
    const statusLabelMap: Record<string, string> = {
      PENDING: 'New Order',
      ACCEPTED: 'Accepted',
      PREPARING: 'Preparing',
      READY: 'Ready for Pickup',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };

    return (
      <Card className="mb-4 bg-slate-900/70 border-slate-800 text-slate-100">
        {hasAllergenAlerts && (
          <div className="bg-red-600 text-white p-3 mb-3 rounded-lg">
            <p className="font-bold text-lg">ALLERGY ALERT!</p>
            <p>{order.allergenAlerts?.join(', ').toUpperCase()}!</p>
          </div>
        )}
        
        <div className="mb-3">
          <h3 className="font-semibold text-lg">
            {statusLabelMap[order.status] || 'Order Update'}
          </h3>
          <p className="text-sm text-slate-300">From: {order.consumerName}</p>
          <p className="text-sm text-slate-400">Order ID: {order.orderId.slice(-8)}</p>
        </div>

        <div className="mb-3">
          <h4 className="font-medium mb-2">Items:</h4>
          <ul className="space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="text-sm text-slate-200">
                {item.name} × {item.quantity} - ${((item.price * item.quantity) / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-emerald-200">Total: ${(order.vendorTotal / 100).toFixed(2)}</span>
        </div>

        {order.status === 'PENDING' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleAccept(order.orderId)}
              className="flex-1"
              variant="primary"
            >
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
          <div className="flex gap-2">
            <Button
              onClick={() => handleStatusChange(order.orderId, 'PREPARING', order.vendorId)}
              className="flex-1"
            >
              Start Preparing
            </Button>
          </div>
        )}

        {order.status === 'PREPARING' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleStatusChange(order.orderId, 'READY', order.vendorId)}
              className="flex-1"
              variant="primary"
            >
              Mark Ready
            </Button>
          </div>
        )}

        {order.status === 'READY' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleStatusChange(order.orderId, 'DELIVERED', order.vendorId)}
              className="flex-1"
              variant="secondary"
            >
              Mark Delivered
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Kitchen Display System</h1>
            <p className="text-sm text-slate-400">Live queue and allergy alerts</p>
          </div>
          <UserButton 
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10',
                userButtonPopoverCard: 'bg-gray-800 border-gray-700',
                userButtonPopoverActionButton: 'text-white hover:bg-gray-700',
              },
            }}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* New Orders Column */}
          <div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">New Orders</h2>
              <Badge variant="warning">{newOrders.length}</Badge>
            </div>
            <div className="space-y-4">
              {newOrders.length === 0 ? (
                <Card className="text-center py-8 text-slate-400 bg-slate-900/60 border-slate-800">
                  No new orders
                </Card>
              ) : (
                newOrders.map((order) => (
                  <OrderCard key={order.orderId} order={order} />
                ))
              )}
            </div>
          </div>

          {/* To Prep Column */}
          <div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">To Prep</h2>
              <Badge variant="info">{toPrep.length}</Badge>
            </div>
            <div className="space-y-4">
              {toPrep.length === 0 ? (
                <Card className="text-center py-8 text-slate-400 bg-slate-900/60 border-slate-800">
                  No orders to prep
                </Card>
              ) : (
                toPrep.map((order) => (
                  <OrderCard key={order.orderId} order={order} />
                ))
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">Ready</h2>
              <Badge variant="success">{ready.length}</Badge>
            </div>
            <div className="space-y-4">
              {ready.length === 0 ? (
                <Card className="text-center py-8 text-slate-400 bg-slate-900/60 border-slate-800">
                  No orders ready
                </Card>
              ) : (
                ready.map((order) => (
                  <OrderCard key={order.orderId} order={order} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

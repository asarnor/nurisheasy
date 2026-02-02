'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const vendorOrders = data.orders || [];
        
        // Filter and categorize orders
        const newOrdersList: SubOrder[] = [];
        const toPrepList: SubOrder[] = [];
        const readyList: SubOrder[] = [];

        vendorOrders.forEach((order: any) => {
          const subOrder = order.subOrders.find(
            (so: any) => so.vendorId === order.vendorId
          );
          
          if (subOrder) {
            const subOrderData: SubOrder = {
              ...subOrder,
              orderId: order._id,
              consumerName: order.consumerId?.name || 'Unknown',
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
      const response = await fetch(`/api/orders/${orderId}/accept`, {
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

  const handleReject = async (orderId: string) => {
    if (!confirm('Are you sure you want to reject this order?')) {
      return;
    }
    // Implement reject logic
    console.log('Reject order:', orderId);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Implement status update logic
    console.log('Update status:', orderId, newStatus);
    fetchOrders();
  };

  const OrderCard = ({ order }: { order: SubOrder }) => {
    const hasAllergenAlerts = order.allergenAlerts && order.allergenAlerts.length > 0;

    return (
      <Card className="mb-4">
        {hasAllergenAlerts && (
          <div className="bg-red-600 text-white p-3 mb-3 rounded-lg">
            <p className="font-bold text-lg">ALLERGY ALERT!</p>
            <p>{order.allergenAlerts?.join(', ').toUpperCase()}!</p>
          </div>
        )}
        
        <div className="mb-3">
          <h3 className="font-semibold text-lg">New Order</h3>
          <p className="text-sm text-gray-600">From: {order.consumerName}</p>
          <p className="text-sm text-gray-600">Order ID: {order.orderId.slice(-8)}</p>
        </div>

        <div className="mb-3">
          <h4 className="font-medium mb-2">Items:</h4>
          <ul className="space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="text-sm">
                {item.name} × {item.quantity} - ${((item.price * item.quantity) / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">Total: ${(order.vendorTotal / 100).toFixed(2)}</span>
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
              onClick={() => handleReject(order.orderId)}
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
              onClick={() => handleStatusChange(order.orderId, 'PREPARING')}
              className="flex-1"
            >
              Start Preparing
            </Button>
          </div>
        )}

        {order.status === 'PREPARING' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleStatusChange(order.orderId, 'READY')}
              className="flex-1"
              variant="primary"
            >
              Mark Ready
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Kitchen Display System</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New Orders Column */}
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">New Orders</h2>
              <Badge variant="warning">{newOrders.length}</Badge>
            </div>
            <div className="space-y-4">
              {newOrders.length === 0 ? (
                <Card className="text-center py-8 text-gray-400">
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
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">To Prep</h2>
              <Badge variant="info">{toPrep.length}</Badge>
            </div>
            <div className="space-y-4">
              {toPrep.length === 0 ? (
                <Card className="text-center py-8 text-gray-400">
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
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">Ready</h2>
              <Badge variant="success">{ready.length}</Badge>
            </div>
            <div className="space-y-4">
              {ready.length === 0 ? (
                <Card className="text-center py-8 text-gray-400">
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

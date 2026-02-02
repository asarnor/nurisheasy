'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface SubOrder {
  vendorId: string;
  vendorName: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  vendorTotal: number;
}

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  subOrders: SubOrder[];
  createdAt: string;
}

export default function DisputeResolutionPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedSubOrderIndex, setSelectedSubOrderIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders?orderId=${orderId}`);
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

  const handleRefund = async () => {
    if (selectedSubOrderIndex === null || !order) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subOrderIndex: selectedSubOrderIndex,
        }),
      });

      if (response.ok) {
        alert('Refund processed successfully');
        fetchOrder();
        setSelectedSubOrderIndex(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      alert(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">Order not found</p>
          <Button onClick={() => router.push('/admin/orders')}>
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const selectedSubOrder =
    selectedSubOrderIndex !== null ? order.subOrders[selectedSubOrderIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 md:hidden">
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">Refund Issue</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 hidden md:block">
            Dispute Resolution
          </h1>
          <p className="text-gray-600">Order #{orderId.slice(-8)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sub-Orders List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Sub-Orders</h2>
            {order.subOrders.map((subOrder, index) => (
              <Card
                key={index}
                onClick={() => setSelectedSubOrderIndex(index)}
                className={`cursor-pointer ${
                  selectedSubOrderIndex === index ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{subOrder.vendorName}</h3>
                  <Badge
                    variant={
                      subOrder.status === 'REFUNDED' ? 'danger' : 'info'
                    }
                  >
                    {subOrder.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {subOrder.items.length} items
                </div>
                <div className="font-semibold">
                  ${(subOrder.vendorTotal / 100).toFixed(2)}
                </div>
              </Card>
            ))}
          </div>

          {/* Refund Panel */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-semibold mb-4">Refund Details</h2>
              {selectedSubOrder ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <p className="font-semibold">{selectedSubOrder.vendorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Amount
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      ${(selectedSubOrder.vendorTotal / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items
                    </label>
                    <ul className="space-y-1 text-sm">
                      {selectedSubOrder.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={handleRefund}
                    className="w-full"
                    variant="primary"
                    disabled={processing || selectedSubOrder.status === 'REFUNDED'}
                  >
                    {processing
                      ? 'Processing...'
                      : selectedSubOrder.status === 'REFUNDED'
                      ? 'Already Refunded'
                      : 'Refund'}
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  Select a sub-order to process refund
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AdminShell } from '@/components/layout/AdminShell';
import { apiFetch } from '@/lib/utils/api';

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

  const handleRefund = async () => {
    if (selectedSubOrderIndex === null || !order) return;

    try {
      setProcessing(true);
      const response = await apiFetch(`/api/orders/${orderId}/refund`, {
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
          <Button onClick={() => router.push('/admin/triage')}>
            Back to Triage
          </Button>
        </Card>
      </div>
    );
  }

  const selectedSubOrder =
    selectedSubOrderIndex !== null ? order.subOrders[selectedSubOrderIndex] : null;

  const getVendorName = (subOrder: SubOrder) => {
    if (subOrder.vendorName) return subOrder.vendorName;
    if (typeof subOrder.vendorId === 'object' && subOrder.vendorId?.name) {
      return subOrder.vendorId.name;
    }
    return 'Vendor';
  };

  return (
    <AdminShell
      title="Dispute Resolution"
      subtitle={`Order #${orderId.slice(-8)} • Review sub-orders and process refunds`}
      active="triage"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sub-Orders List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Sub-Orders</h2>
          {order.subOrders.map((subOrder, index) => (
            <Card
              key={index}
              onClick={() => setSelectedSubOrderIndex(index)}
              className={`cursor-pointer ${
                selectedSubOrderIndex === index ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{getVendorName(subOrder)}</h3>
                <Badge
                  variant={subOrder.status === 'REFUNDED' ? 'danger' : 'info'}
                >
                  {subOrder.status}
                </Badge>
              </div>
              <div className="text-sm text-slate-500 mb-2">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Vendor
                  </label>
                  <p className="font-semibold">{getVendorName(selectedSubOrder)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Refund Amount
                  </label>
                  <p className="text-2xl font-semibold text-emerald-600">
                    ${(selectedSubOrder.vendorTotal / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Items
                  </label>
                  <ul className="space-y-1 text-sm text-slate-600">
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
              <p className="text-slate-500 text-sm">
                Select a sub-order to process refund
              </p>
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

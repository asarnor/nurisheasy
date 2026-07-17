'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VendorReviewForm } from '@/components/consumer/VendorReviewForm';
import { ContractOrderSummary } from '@/components/orders/ContractOrderSummary';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import type { FulfillmentMethod } from '@/lib/contract-options';
import type { MealCategory } from '@/lib/meal-categories';
import {
  getOrderContractDetails,
  type ContractSummary,
  type OrderWithContract,
} from '@/lib/types';

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
  deliveryFeeCents?: number;
  subOrders: SubOrder[];
  createdAt: string;
  consumerId?: { _id?: string; name?: string };
  consumerName?: string;
  contractDurationMonths?: 3 | 6 | 9 | 12;
  preparationDayOfWeek?: number;
  mealPeriods?: MealCategory[];
  fulfillmentMethod?: FulfillmentMethod;
  contractStartDate?: string;
  contractEndDate?: string;
}

interface Review {
  id: string;
  orderId: string;
  vendorId: string;
  rating: number;
  comment?: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const [orderResponse, reviewResponse] = await Promise.all([
        apiFetch(`/api/orders?orderId=${orderId}`),
        apiFetch(`/api/reviews?orderId=${orderId}`),
      ]);

      if (orderResponse.ok) {
        const data = await orderResponse.json();
        const foundOrder = data.orders?.find((o: Order) => o._id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        }
      }

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        setReviews(reviewData.reviews || []);
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

  const getVendorId = (subOrder: SubOrder) => {
    if (typeof subOrder.vendorId === 'object' && subOrder.vendorId?._id) {
      return subOrder.vendorId._id;
    }
    return String(subOrder.vendorId);
  };

  const getVendorName = (subOrder: SubOrder) => {
    if (subOrder.vendorName) return subOrder.vendorName;
    if (typeof subOrder.vendorId === 'object' && subOrder.vendorId?.name) {
      return subOrder.vendorId.name;
    }
    return 'Vendor';
  };

  const getReviewForVendor = (vendorId: string) =>
    reviews.find((review) => review.vendorId === vendorId);

  const getConsumerName = (orderData: Order) =>
    orderData.consumerId?.name || orderData.consumerName || "Tommy's Home Care";

  if (loading) {
    return (
      <ConsumerShell active="orders" title="Order details" subtitle="Loading order...">
        <p className="text-slate-500">Loading order...</p>
      </ConsumerShell>
    );
  }

  if (!order) {
    return (
      <ConsumerShell
        active="orders"
        title="Order not found"
        showBack
        onBack={() => router.push(consumerPath('/orders'))}
      >
        <Card className="text-center py-12 max-w-lg">
          <p className="text-slate-500 mb-4">Order not found</p>
          <button
            type="button"
            onClick={() => router.push(consumerPath('/orders'))}
            className="text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            View all orders
          </button>
        </Card>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell
      active="orders"
      title={`Order #${orderId.slice(-8)}`}
      subtitle={`Placed on ${new Date(order.createdAt).toLocaleString()}`}
      showBack
      onBack={() => router.push(consumerPath('/orders'))}
    >
      <div className="max-w-4xl space-y-6">
        <ContractOrderSummary
          order={{
            consumerName: getConsumerName(order),
            contractDurationMonths: order.contractDurationMonths,
            preparationDayOfWeek: order.preparationDayOfWeek,
            mealPeriods: order.mealPeriods,
            fulfillmentMethod: order.fulfillmentMethod,
            deliveryFeeCents: order.deliveryFeeCents,
            contractStartDate: order.contractStartDate ?? order.createdAt,
            contractEndDate: order.contractEndDate,
          }}
        />

        {order.subOrders.map((subOrder, index) => {
          const timeline = getStatusTimeline(subOrder);
          const vendorId = getVendorId(subOrder);
          const existingReview = getReviewForVendor(vendorId);

          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{getVendorName(subOrder)}</h2>
                <Badge variant={getStatusColor(subOrder.status) as 'success' | 'warning' | 'danger' | 'info'}>
                  {subOrder.status}
                </Badge>
              </div>

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

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-medium mb-3">Items:</h3>
                <div className="space-y-2">
                  {subOrder.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex justify-between text-sm">
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

              {subOrder.status === 'DELIVERED' && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <VendorReviewForm
                    orderId={order._id}
                    vendorId={vendorId}
                    vendorName={getVendorName(subOrder)}
                    fulfillmentMethod={order.fulfillmentMethod || 'pickup'}
                    existingRating={existingReview?.rating}
                    existingComment={existingReview?.comment}
                    onSubmitted={fetchOrder}
                  />
                </div>
              )}
            </Card>
          );
        })}

        <Card className="p-6 bg-slate-50/70">
          <div className="space-y-2 mb-4">
            {order.deliveryFeeCents ? (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Delivery fee</span>
                <span>${(order.deliveryFeeCents / 100).toFixed(2)}</span>
              </div>
            ) : null}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Order Total</span>
            <span className="text-3xl font-semibold">
              ${(order.totalAmount / 100).toFixed(2)}
            </span>
          </div>
        </Card>
      </div>
    </ConsumerShell>
  );
}

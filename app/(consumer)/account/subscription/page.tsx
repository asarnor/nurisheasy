'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { ContractOrderSummary } from '@/components/orders/ContractOrderSummary';
import { apiFetch } from '@/lib/utils/api';
import { consumerPath } from '@/lib/utils/debug-client';
import { getDaysUntilContractEnd } from '@/lib/contract-options';
import { getOrderContractDetails, type OrderWithContract } from '@/lib/types';

interface Order extends OrderWithContract {
  _id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  consumerId?: { name?: string };
}

export default function AccountSubscriptionPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [facilityName, setFacilityName] = useState("Tommy's Home Care");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, orgRes] = await Promise.all([
          apiFetch('/api/orders'),
          apiFetch('/api/organizations'),
        ]);

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (orgData.organization?.name) setFacilityName(orgData.organization.name);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          const contractual = (data.orders || []).filter((order: Order) => {
            const details = getOrderContractDetails(order);
            return Boolean(details.contractDurationMonths || order.contractId);
          });
          setOrders(contractual);
        }
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeContracts = orders.filter((order) => {
    const details = getOrderContractDetails(order);
    const days = getDaysUntilContractEnd(details.contractEndDate);
    return days === null || days >= 0;
  });

  return (
    <ConsumerAccountShell
      active="subscription"
      title="Subscription"
      subtitle="Your active food service contracts with vendors."
    >
      {loading ? (
        <p className="text-slate-500">Loading subscriptions...</p>
      ) : activeContracts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500 mb-4">No active food service contracts</p>
          <button
            type="button"
            onClick={() => router.push(consumerPath('/marketplace'))}
            className="text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Start a new contract from the marketplace
          </button>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeContracts.map((order) => {
            const contractDetails = getOrderContractDetails(order);
            return (
              <div key={order._id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => router.push(consumerPath(`/orders/${order._id}`))}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    View order #{order._id.slice(-8)} →
                  </button>
                  <Badge variant="success">Active</Badge>
                </div>
                <ContractOrderSummary
                  order={{
                    consumerName: order.consumerId?.name || facilityName,
                    contractDurationMonths: contractDetails.contractDurationMonths,
                    preparationDayOfWeek: contractDetails.preparationDayOfWeek,
                    mealPeriods: contractDetails.mealPeriods,
                    fulfillmentMethod: contractDetails.fulfillmentMethod,
                    deliveryFeeCents: contractDetails.deliveryFeeCents,
                    contractStartDate: contractDetails.contractStartDate ?? order.createdAt,
                    contractEndDate: contractDetails.contractEndDate,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </ConsumerAccountShell>
  );
}

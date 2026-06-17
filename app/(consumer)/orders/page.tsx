'use client';

import React from 'react';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { ConsumerOrdersList } from '@/components/consumer/ConsumerOrdersList';

export default function OrdersPage() {
  return (
    <ConsumerShell
      active="orders"
      title="My Orders"
      subtitle="Track in-progress orders and view your order history."
    >
      <div className="max-w-4xl">
        <ConsumerOrdersList />
      </div>
    </ConsumerShell>
  );
}

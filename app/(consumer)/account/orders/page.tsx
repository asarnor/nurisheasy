'use client';

import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';
import { ConsumerOrdersList } from '@/components/consumer/ConsumerOrdersList';

export default function AccountOrdersPage() {
  return (
    <ConsumerAccountShell
      active="orders"
      title="Order history"
      subtitle="All orders placed for your group home."
    >
      <ConsumerOrdersList />
    </ConsumerAccountShell>
  );
}

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DeliveryTrackingMap } from '@/components/consumer/DeliveryTrackingMap';
import type { DeliveryTrackingPayload } from '@/lib/delivery-tracking';

const statusLabel: Record<string, string> = {
  in_transit: 'Driver is on the way',
  arrived: 'Driver has arrived',
  delivered: 'Delivered',
};

interface DeliveryTrackingPanelProps {
  delivery: DeliveryTrackingPayload;
}

export const DeliveryTrackingPanel: React.FC<DeliveryTrackingPanelProps> = ({ delivery }) => {
  const driverPosition = delivery.currentLocation
    ? { lat: delivery.currentLocation.lat, lng: delivery.currentLocation.lng }
    : null;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Live delivery tracking</h2>
          <p className="text-sm text-slate-500">
            {delivery.driver.name} is delivering your order
          </p>
        </div>
        <Badge variant={delivery.status === 'delivered' ? 'success' : 'info'}>
          {statusLabel[delivery.status] || delivery.status}
        </Badge>
      </div>

      <DeliveryTrackingMap destination={delivery.destination} driver={driverPosition} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">ETA</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {delivery.etaMinutes ? `~${delivery.etaMinutes} min` : 'Updating...'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Distance</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {delivery.distanceKm ? `${delivery.distanceKm} km` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Destination</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {delivery.destination.street}
          </p>
        </div>
      </div>
    </Card>
  );
};

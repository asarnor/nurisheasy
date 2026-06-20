'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DeliveryTrackingMap } from '@/components/consumer/DeliveryTrackingMap';
import { VendorShell } from '@/components/layout/VendorShell';
import { apiFetch } from '@/lib/utils/api';
import { vendorPath } from '@/lib/utils/debug-client';
import type { DeliveryTrackingPayload } from '@/lib/delivery-tracking';
import { ResetDeliveryDemoButton } from '@/components/debug/ResetDeliveryDemoButton';

const statusLabel: Record<string, string> = {
  in_transit: 'On the way',
  arrived: 'Arrived',
  delivered: 'Delivered',
};

export default function VendorDeliveryView() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [delivery, setDelivery] = useState<DeliveryTrackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const loadDelivery = useCallback(async () => {
    const response = await apiFetch(`/api/orders/${orderId}/delivery`);
    if (!response.ok) {
      setError('Could not load delivery details.');
      return;
    }

    const data = await response.json();
    setDelivery(data.delivery || null);
    setError(data.delivery ? null : 'No active delivery found for this order.');
  }, [orderId]);

  useEffect(() => {
    loadDelivery().finally(() => setLoading(false));
  }, [loadDelivery]);

  const postLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!delivery) return;

      await apiFetch(`/api/deliveries/${delivery.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || undefined,
          accuracy: position.coords.accuracy,
        }),
      });

      const trackingResponse = await apiFetch(`/api/deliveries/${delivery.id}/tracking`);
      if (trackingResponse.ok) {
        const data = await trackingResponse.json();
        setDelivery(data.delivery);
      }
    },
    [delivery]
  );

  const startSharingLocation = () => {
    if (!navigator.geolocation || !delivery) {
      setError('Geolocation is not available on this device.');
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        postLocation(position).catch((err) => {
          console.error('Failed to post delivery location:', err);
        });
      },
      (geoError) => {
        setError(geoError.message || 'Unable to access location.');
        setSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    setWatchId(id);
    setSharingLocation(true);
    setError(null);
  };

  const stopSharingLocation = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setSharingLocation(false);
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const handleComplete = async () => {
    if (!delivery) return;

    const response = await apiFetch(`/api/deliveries/${delivery.id}/complete`, {
      method: 'POST',
    });

    if (!response.ok) {
      setError('Failed to mark delivery complete.');
      return;
    }

    stopSharingLocation();
    router.push(vendorPath('/vendor/kds'));
  };

  if (loading) {
    return (
      <VendorShell active="kds" title="Delivery" subtitle="Loading delivery...">
        <p className="text-slate-500">Loading delivery...</p>
      </VendorShell>
    );
  }

  if (!delivery) {
    return (
      <VendorShell
        active="kds"
        title="Delivery"
        subtitle="No active delivery"
        showBack
        onBack={() => router.push(vendorPath('/vendor/kds'))}
      >
        <Card className="max-w-lg p-6">
          <p className="text-slate-600">{error || 'No active delivery found.'}</p>
          <Button className="mt-4" onClick={() => router.push(vendorPath('/vendor/kds'))}>
            Back to KDS
          </Button>
        </Card>
      </VendorShell>
    );
  }

  const driverPosition = delivery.currentLocation
    ? { lat: delivery.currentLocation.lat, lng: delivery.currentLocation.lng }
    : null;

  return (
    <VendorShell
      active="kds"
      title={`Delivery #${orderId.slice(-8)}`}
      subtitle={delivery.destination.street}
      showBack
      onBack={() => router.push(vendorPath('/vendor/kds'))}
    >
      <div className="max-w-3xl space-y-6">
        <Card className="border-dashed border-slate-200 bg-slate-50/80 p-4">
          <ResetDeliveryDemoButton
            onReset={() => {
              loadDelivery().then(() => router.push(vendorPath('/vendor/kds')));
            }}
          />
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {delivery.driver.name}
              </h2>
              <p className="text-sm text-slate-500">
                Delivering to {delivery.destination.city}, {delivery.destination.state}
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
                {delivery.etaMinutes ? `${delivery.etaMinutes} min` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Distance</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {delivery.distanceKm ? `${delivery.distanceKm} km` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last update</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {delivery.currentLocation?.updatedAt
                  ? new Date(delivery.currentLocation.updatedAt).toLocaleTimeString()
                  : '—'}
              </p>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {delivery.status !== 'delivered' ? (
              <>
                <Button
                  className="flex-1"
                  onClick={sharingLocation ? stopSharingLocation : startSharingLocation}
                >
                  {sharingLocation ? 'Pause location sharing' : 'Share live location'}
                </Button>
                <Button className="flex-1" variant="secondary" onClick={handleComplete}>
                  Mark delivered
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={() => router.push(vendorPath('/vendor/kds'))}>
                Back to KDS
              </Button>
            )}
          </div>
        </Card>
      </div>
    </VendorShell>
  );
}

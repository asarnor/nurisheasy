'use client';

import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface DeliveryTrackingMapProps {
  destination: { lat: number; lng: number };
  driver?: { lat: number; lng: number } | null;
  className?: string;
}

export const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  destination,
  driver,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (position: { lat: number; lng: number }) => void;
    fitBounds: (bounds: { extend: (position: { lat: number; lng: number }) => void }, padding?: number) => void;
  } | null>(null);
  const driverMarkerRef = useRef<{
    setPosition: (position: { lat: number; lng: number }) => void;
    setMap: (map: unknown | null) => void;
  } | null>(null);
  const destinationMarkerRef = useRef<{
    setPosition: (position: { lat: number; lng: number }) => void;
  } | null>(null);
  const mapsApiRef = useRef<{
    Map: new (
      element: HTMLElement,
      options: { center: { lat: number; lng: number }; zoom: number; mapTypeControl: boolean; streetViewControl: boolean; fullscreenControl: boolean }
    ) => {
      setCenter: (position: { lat: number; lng: number }) => void;
      fitBounds: (bounds: { extend: (position: { lat: number; lng: number }) => void }, padding?: number) => void;
    };
    Marker: new (options: {
      map: unknown;
      position: { lat: number; lng: number };
      title?: string;
      label?: string;
    }) => {
      setPosition: (position: { lat: number; lng: number }) => void;
      setMap: (map: unknown | null) => void;
    };
    LatLngBounds: new () => { extend: (position: { lat: number; lng: number }) => void };
  } | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const loader = new Loader({
        apiKey,
        version: 'weekly',
      });

      const maps = (await loader.importLibrary('maps')) as typeof mapsApiRef.current;
      if (!maps || cancelled || !mapRef.current) return;

      mapsApiRef.current = maps;
      const center = driver || destination;
      const map = new maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;

      destinationMarkerRef.current = new maps.Marker({
        map,
        position: destination,
        title: 'Delivery destination',
        label: 'H',
      });

      if (driver) {
        driverMarkerRef.current = new maps.Marker({
          map,
          position: driver,
          title: 'Driver',
          label: 'D',
        });
      }
    };

    initMap().catch((error) => {
      console.error('Failed to load delivery map:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [destination.lat, destination.lng]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    if (!mapInstanceRef.current || !maps) return;

    destinationMarkerRef.current?.setPosition(destination);

    if (driver) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new maps.Marker({
          map: mapInstanceRef.current,
          position: driver,
          title: 'Driver',
          label: 'D',
        });
      } else {
        driverMarkerRef.current.setPosition(driver);
      }

      const bounds = new maps.LatLngBounds();
      bounds.extend(driver);
      bounds.extend(destination);
      mapInstanceRef.current.fitBounds(bounds, 64);
    } else {
      driverMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      mapInstanceRef.current.setCenter(destination);
    }
  }, [destination, driver]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 ${className}`}
      >
        <p className="font-medium text-slate-800">Live map unavailable</p>
        <p className="mt-1">
          Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show the delivery map.
        </p>
        {driver ? (
          <p className="mt-3">
            Driver: {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
          </p>
        ) : null}
        <p className="mt-1">
          Destination: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${className}`}
    />
  );
};

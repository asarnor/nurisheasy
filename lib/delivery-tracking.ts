import { calculateDistance } from '@/lib/utils/geospatial';

export type DeliveryStatus =
  | 'scheduled'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export interface DeliveryCoordinates {
  lat: number;
  lng: number;
}

export interface DeliveryAddress extends DeliveryCoordinates {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface DeliveryLocation extends DeliveryCoordinates {
  heading?: number;
  accuracy?: number;
  updatedAt: string;
}

export interface DeliveryDriver {
  name: string;
  phone?: string;
}

export interface DeliveryTrackingPayload {
  id: string;
  orderId: string;
  subOrderIndex: number;
  vendorId: string;
  consumerId: string;
  status: DeliveryStatus;
  destination: DeliveryAddress;
  origin: DeliveryCoordinates;
  driver: DeliveryDriver;
  currentLocation: DeliveryLocation | null;
  etaMinutes: number | null;
  distanceKm: number | null;
  startedAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
}

export const DELIVERY_AVG_SPEED_KMH = 30;
export const DELIVERY_ARRIVAL_THRESHOLD_KM = 0.15;
export const DEMO_DELIVERY_ORDER_ID = 'order_mock_1003';

export const estimateEtaMinutes = (
  current: DeliveryCoordinates,
  destination: DeliveryCoordinates,
  avgSpeedKmh: number = DELIVERY_AVG_SPEED_KMH
): number => {
  const distanceKm = calculateDistance(
    current.lat,
    current.lng,
    destination.lat,
    destination.lng
  );
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
};

export const getDistanceKm = (
  current: DeliveryCoordinates,
  destination: DeliveryCoordinates
): number => {
  return (
    Math.round(
      calculateDistance(current.lat, current.lng, destination.lat, destination.lng) * 100
    ) / 100
  );
};

export const hasArrived = (
  current: DeliveryCoordinates,
  destination: DeliveryCoordinates,
  thresholdKm: number = DELIVERY_ARRIVAL_THRESHOLD_KM
): boolean => {
  return getDistanceKm(current, destination) <= thresholdKm;
};

export const buildTrackingPayload = (input: {
  id: string;
  orderId: string;
  subOrderIndex: number;
  vendorId: string;
  consumerId: string;
  status: DeliveryStatus;
  destination: DeliveryAddress;
  origin: DeliveryCoordinates;
  driver: DeliveryDriver;
  currentLocation?: DeliveryLocation | null;
  startedAt?: string | Date | null;
  arrivedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
}): DeliveryTrackingPayload => {
  const currentLocation = input.currentLocation ?? null;
  const destination = input.destination;

  let etaMinutes: number | null = null;
  let distanceKm: number | null = null;

  if (currentLocation && input.status !== 'delivered' && input.status !== 'cancelled') {
    distanceKm = getDistanceKm(currentLocation, destination);
    etaMinutes = estimateEtaMinutes(currentLocation, destination);
  }

  return {
    id: input.id,
    orderId: input.orderId,
    subOrderIndex: input.subOrderIndex,
    vendorId: input.vendorId,
    consumerId: input.consumerId,
    status: input.status,
    destination,
    origin: input.origin,
    driver: input.driver,
    currentLocation,
    etaMinutes,
    distanceKm,
    startedAt: input.startedAt ? new Date(input.startedAt).toISOString() : null,
    arrivedAt: input.arrivedAt ? new Date(input.arrivedAt).toISOString() : null,
    deliveredAt: input.deliveredAt ? new Date(input.deliveredAt).toISOString() : null,
  };
};

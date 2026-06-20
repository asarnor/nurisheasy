import connectDB from '@/lib/mongodb';
import Delivery, { type IDelivery } from '@/lib/models/delivery.model';
import Order from '@/lib/models/order.model';
import Organization from '@/lib/models/organization.model';
import {
  buildTrackingPayload,
  hasArrived,
  type DeliveryTrackingPayload,
} from '@/lib/delivery-tracking';
import { cacheDeliveryLocation, getCachedDeliveryLocation } from '@/lib/redis';

const resolveCurrentLocation = async (delivery: IDelivery) => {
  const cached = await getCachedDeliveryLocation(delivery._id.toString());
  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      heading: cached.heading,
      accuracy: cached.accuracy,
      updatedAt: cached.updatedAt,
    };
  }

  if (!delivery.currentLocation?.lat || !delivery.currentLocation?.lng) {
    return null;
  }

  return {
    lat: delivery.currentLocation.lat,
    lng: delivery.currentLocation.lng,
    heading: delivery.currentLocation.heading,
    accuracy: delivery.currentLocation.accuracy,
    updatedAt: delivery.currentLocation.updatedAt?.toISOString() || new Date().toISOString(),
  };
};

export const serializeDeliveryTracking = async (
  delivery: IDelivery
): Promise<DeliveryTrackingPayload> => {
  const currentLocation = await resolveCurrentLocation(delivery);

  return buildTrackingPayload({
    id: delivery._id.toString(),
    orderId: delivery.orderId.toString(),
    subOrderIndex: delivery.subOrderIndex,
    vendorId: delivery.vendorId.toString(),
    consumerId: delivery.consumerId.toString(),
    status: delivery.status,
    destination: delivery.destination,
    origin: delivery.origin,
    driver: delivery.driver,
    currentLocation,
    startedAt: delivery.startedAt,
    arrivedAt: delivery.arrivedAt,
    deliveredAt: delivery.deliveredAt,
  });
};

export const startDeliveryForOrder = async (orderId: string, vendorId: string) => {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order || order.fulfillmentMethod !== 'delivery') {
    return { error: 'Order is not eligible for delivery tracking', status: 400 as const };
  }

  const subOrderIndex = order.subOrders.findIndex(
    (entry) => entry.vendorId.toString() === vendorId
  );
  if (subOrderIndex < 0) {
    return { error: 'Sub-order not found for this vendor', status: 404 as const };
  }

  const subOrder = order.subOrders[subOrderIndex];
  if (subOrder.status !== 'READY') {
    return { error: 'Order must be marked ready before starting delivery', status: 400 as const };
  }

  const existing = await Delivery.findOne({ orderId: order._id, subOrderIndex });
  if (existing && existing.status !== 'delivered' && existing.status !== 'cancelled') {
    return { delivery: existing };
  }

  const [vendor, consumer] = await Promise.all([
    Organization.findById(vendorId),
    Organization.findById(order.consumerId),
  ]);

  if (!vendor?.address?.coordinates || !consumer?.address?.coordinates) {
    return { error: 'Vendor and consumer addresses with coordinates are required', status: 400 as const };
  }

  const now = new Date();
  const origin = vendor.address.coordinates;

  const delivery = await Delivery.create({
    orderId: order._id,
    subOrderIndex,
    vendorId: vendor._id,
    consumerId: consumer._id,
    status: 'in_transit',
    destination: {
      street: consumer.address.street,
      city: consumer.address.city,
      state: consumer.address.state,
      zipCode: consumer.address.zipCode,
      lat: consumer.address.coordinates.lat,
      lng: consumer.address.coordinates.lng,
    },
    origin,
    driver: {
      name: vendor.vendorSettings?.contactName || vendor.name,
      phone: vendor.vendorSettings?.contactPhone,
    },
    currentLocation: {
      lat: origin.lat,
      lng: origin.lng,
      updatedAt: now,
    },
    startedAt: now,
  });

  order.subOrders[subOrderIndex].status = 'OUT_FOR_DELIVERY';
  await order.save();

  await cacheDeliveryLocation(delivery._id.toString(), {
    lat: origin.lat,
    lng: origin.lng,
    updatedAt: now.toISOString(),
  });

  return { delivery };
};

export const updateDeliveryLocation = async (
  deliveryId: string,
  location: { lat: number; lng: number; heading?: number; accuracy?: number }
) => {
  await connectDB();

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { error: 'Delivery not found', status: 404 as const };
  }

  if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
    return { error: 'Delivery is no longer active', status: 400 as const };
  }

  const updatedAt = new Date();
  delivery.currentLocation = {
    lat: location.lat,
    lng: location.lng,
    heading: location.heading,
    accuracy: location.accuracy,
    updatedAt,
  };

  if (delivery.status === 'in_transit' && hasArrived(location, delivery.destination)) {
    delivery.status = 'arrived';
    delivery.arrivedAt = updatedAt;
  }

  await delivery.save();

  await cacheDeliveryLocation(delivery._id.toString(), {
    lat: location.lat,
    lng: location.lng,
    heading: location.heading,
    accuracy: location.accuracy,
    updatedAt: updatedAt.toISOString(),
  });

  return { delivery };
};

export const completeDelivery = async (deliveryId: string) => {
  await connectDB();

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { error: 'Delivery not found', status: 404 as const };
  }

  if (delivery.status === 'delivered') {
    return { delivery };
  }

  if (delivery.status === 'cancelled') {
    return { error: 'Delivery was cancelled', status: 400 as const };
  }

  const order = await Order.findById(delivery.orderId);
  if (!order) {
    return { error: 'Order not found', status: 404 as const };
  }

  const subOrder = order.subOrders[delivery.subOrderIndex];
  if (!subOrder) {
    return { error: 'Sub-order not found', status: 404 as const };
  }

  const now = new Date();
  delivery.status = 'delivered';
  delivery.deliveredAt = now;
  subOrder.status = 'DELIVERED';
  await Promise.all([delivery.save(), order.save()]);

  return { delivery };
};

export const getActiveDeliveryForOrder = async (orderId: string) => {
  await connectDB();
  return Delivery.findOne({
    orderId,
    status: { $in: ['scheduled', 'in_transit', 'arrived'] },
  }).sort({ createdAt: -1 });
};

export const getDeliveryById = async (deliveryId: string) => {
  await connectDB();
  return Delivery.findById(deliveryId);
};

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { DeliveryStatus } from '@/lib/delivery-tracking';

export interface IDelivery extends Document {
  orderId: mongoose.Types.ObjectId;
  subOrderIndex: number;
  vendorId: mongoose.Types.ObjectId;
  consumerId: mongoose.Types.ObjectId;
  status: DeliveryStatus;
  destination: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    lat: number;
    lng: number;
  };
  origin: {
    lat: number;
    lng: number;
  };
  driver: {
    name: string;
    phone?: string;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    accuracy?: number;
    updatedAt: Date;
  };
  startedAt?: Date;
  arrivedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema: Schema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    subOrderIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    consumerId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_transit', 'arrived', 'delivered', 'cancelled'],
      default: 'scheduled',
    },
    destination: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    origin: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    driver: {
      name: { type: String, required: true },
      phone: String,
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      heading: Number,
      accuracy: Number,
      updatedAt: Date,
    },
    startedAt: Date,
    arrivedAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

DeliverySchema.index({ orderId: 1, subOrderIndex: 1 }, { unique: true });
DeliverySchema.index({ status: 1, updatedAt: -1 });

const Delivery: Model<IDelivery> =
  mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', DeliverySchema);

export default Delivery;

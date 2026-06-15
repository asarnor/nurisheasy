import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryRules {
  trackStock: boolean;
  lowStockThreshold: number;
  autoDisableAtZero: boolean;
  requireDailyVerification: boolean;
  verificationWindowHours: number;
}

export interface IDeliveryTimingRules {
  maxPrepTimeMinutes: number;
  defaultDeliveryWindowMinutes: number;
  orderCutoffTime: string; // "HH:MM" in 24h format
  advanceOrderMinHours: number;
  vendorAcceptanceTimeoutMinutes: number;
  lateDeliveryThresholdMinutes: number;
}

export interface IContractMinimumRules {
  minimumOrderAmountCents: number;
  minimumVendorSubOrderCents: number;
  minimumMonthlyOrderCount: number;
  minimumWeeklyMenuItems: number;
  contractRenewalDays: number;
}

export interface IPortionProtocolRules {
  maxPortionsPerItem: number;
  maxItemsPerOrder: number;
  maxOrdersPerDay: number;
  requirePortionJustification: boolean;
  portionJustificationThreshold: number;
  defaultServingSizeOz: number;
  maxServingSizeOz: number;
}

export interface IPlatformRule extends Document {
  version: number;
  isActive: boolean;
  inventory: IInventoryRules;
  deliveryTiming: IDeliveryTimingRules;
  contractMinimums: IContractMinimumRules;
  portionProtocols: IPortionProtocolRules;
  platformFeePercent: number;
  deliveryRadiusKm: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformRuleSchema: Schema = new Schema(
  {
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inventory: {
      trackStock: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 10, min: 0 },
      autoDisableAtZero: { type: Boolean, default: true },
      requireDailyVerification: { type: Boolean, default: false },
      verificationWindowHours: { type: Number, default: 24, min: 1 },
    },
    deliveryTiming: {
      maxPrepTimeMinutes: { type: Number, default: 60, min: 1 },
      defaultDeliveryWindowMinutes: { type: Number, default: 45, min: 1 },
      orderCutoffTime: {
        type: String,
        default: '20:00',
        validate: {
          validator: (v: string) => /^\d{2}:\d{2}$/.test(v),
          message: 'Order cutoff time must be in HH:MM format',
        },
      },
      advanceOrderMinHours: { type: Number, default: 1, min: 0 },
      vendorAcceptanceTimeoutMinutes: { type: Number, default: 15, min: 1 },
      lateDeliveryThresholdMinutes: { type: Number, default: 15, min: 1 },
    },
    contractMinimums: {
      minimumOrderAmountCents: { type: Number, default: 2000, min: 0 },
      minimumVendorSubOrderCents: { type: Number, default: 1000, min: 0 },
      minimumMonthlyOrderCount: { type: Number, default: 0, min: 0 },
      minimumWeeklyMenuItems: { type: Number, default: 3, min: 0 },
      contractRenewalDays: { type: Number, default: 90, min: 1 },
    },
    portionProtocols: {
      maxPortionsPerItem: { type: Number, default: 25, min: 1 },
      maxItemsPerOrder: { type: Number, default: 50, min: 1 },
      maxOrdersPerDay: { type: Number, default: 5, min: 1 },
      requirePortionJustification: { type: Boolean, default: true },
      portionJustificationThreshold: { type: Number, default: 10, min: 1 },
      defaultServingSizeOz: { type: Number, default: 8, min: 1 },
      maxServingSizeOz: { type: Number, default: 16, min: 1 },
    },
    platformFeePercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    deliveryRadiusKm: {
      type: Number,
      default: 10,
      min: 1,
    },
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

PlatformRuleSchema.index({ isActive: 1, version: -1 });

const PlatformRule: Model<IPlatformRule> =
  mongoose.models.PlatformRule || mongoose.model<IPlatformRule>('PlatformRule', PlatformRuleSchema);

export default PlatformRule;

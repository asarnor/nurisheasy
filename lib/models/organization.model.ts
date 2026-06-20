import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorSettings {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  logoUrl?: string;
  offersPickup?: boolean;
  offersDelivery?: boolean;
  deliveryRadiusKm?: number;
  preparationDays?: number[];
  mealPeriods?: ('breakfast' | 'lunch' | 'dinner')[];
  orderCutoffTime?: string;
  advanceOrderMinHours?: number;
  defaultPrepTimeMinutes?: number;
  autoAcceptOrders?: boolean;
  kdsSoundEnabled?: boolean;
  certifications?: string[];
  allergenPolicyNotes?: string;
  ingredientSourcingNotes?: string;
  offeredContractDurations?: (3 | 6 | 9 | 12)[];
  minimumOrderCents?: number;
  deliveryFeeCents?: number;
  acceptingNewContracts?: boolean;
  notifyNewOrder?: boolean;
  notifyLateAcceptance?: boolean;
  notifyNewReview?: boolean;
  notifyContractEnding?: boolean;
  notificationQuietHoursStart?: string;
  notificationQuietHoursEnd?: string;
}

export interface IOrganization extends Document {
  name: string;
  clerkOrgId: string;
  type: 'consumer' | 'vendor';
  safetyProfile: {
    criticalAllergens: string[]; // HARD BLOCK
    preferences: string[]; // WARN ONLY
    taxExempt: boolean;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  stripeAccountId?: string; // For vendors using Stripe Connect
  marketplaceVisible?: boolean;
  onboardingCompletedAt?: Date;
  vendorSettings?: IVendorSettings;
  consumerSettings?: {
    defaultContractOptions?: {
      contractDurationMonths?: 3 | 6 | 9 | 12;
      preparationDayOfWeek?: number;
      mealPeriods?: ('breakfast' | 'lunch' | 'dinner')[];
      fulfillmentMethod?: 'pickup' | 'delivery';
    };
    notifyOrderUpdates?: boolean;
    notifyDeliveryReminders?: boolean;
    notifyContractRenewal?: boolean;
    notifyReviewReminders?: boolean;
    notifyMarketing?: boolean;
    notificationQuietHoursStart?: string;
    notificationQuietHoursEnd?: string;
  };
  contractTerms?: {
    customMinimumOrderCents?: number;
    customDeliveryRadiusKm?: number;
    customPlatformFeePercent?: number;
    contractStartDate?: Date;
    contractEndDate?: Date;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    clerkOrgId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['consumer', 'vendor'],
      required: true,
    },
    safetyProfile: {
      criticalAllergens: {
        type: [String],
        default: [],
        enum: [
          'PEANUT',
          'TREE_NUT',
          'SHELLFISH',
          'FISH',
          'EGG',
          'DAIRY',
          'SOY',
          'WHEAT',
          'GLUTEN',
          'SESAME',
        ],
      },
      preferences: {
        type: [String],
        default: [],
        enum: ['LOW_SODIUM', 'LOW_FAT', 'VEGETARIAN', 'VEGAN', 'KOSHER', 'HALAL'],
      },
      taxExempt: {
        type: Boolean,
        default: false,
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    stripeAccountId: String,
    marketplaceVisible: { type: Boolean, default: false },
    onboardingCompletedAt: Date,
    vendorSettings: {
      contactName: String,
      contactEmail: String,
      contactPhone: String,
      description: String,
      logoUrl: String,
      offersPickup: { type: Boolean, default: true },
      offersDelivery: { type: Boolean, default: true },
      deliveryRadiusKm: { type: Number, min: 1, default: 15 },
      preparationDays: { type: [Number], default: [1, 3, 5] },
      mealPeriods: {
        type: [String],
        enum: ['breakfast', 'lunch', 'dinner'],
        default: ['breakfast', 'lunch', 'dinner'],
      },
      orderCutoffTime: { type: String, default: '20:00' },
      advanceOrderMinHours: { type: Number, min: 0, default: 24 },
      defaultPrepTimeMinutes: { type: Number, min: 1, default: 60 },
      autoAcceptOrders: { type: Boolean, default: false },
      kdsSoundEnabled: { type: Boolean, default: true },
      certifications: { type: [String], default: [] },
      allergenPolicyNotes: String,
      ingredientSourcingNotes: String,
      offeredContractDurations: {
        type: [Number],
        enum: [3, 6, 9, 12],
        default: [3, 6, 9, 12],
      },
      minimumOrderCents: { type: Number, min: 0, default: 2000 },
      deliveryFeeCents: { type: Number, min: 0, default: 1500 },
      acceptingNewContracts: { type: Boolean, default: true },
      notifyNewOrder: { type: Boolean, default: true },
      notifyLateAcceptance: { type: Boolean, default: true },
      notifyNewReview: { type: Boolean, default: true },
      notifyContractEnding: { type: Boolean, default: true },
      notificationQuietHoursStart: { type: String, default: '22:00' },
      notificationQuietHoursEnd: { type: String, default: '07:00' },
    },
    consumerSettings: {
      defaultContractOptions: {
        contractDurationMonths: { type: Number, enum: [3, 6, 9, 12], default: 3 },
        preparationDayOfWeek: { type: Number, min: 0, max: 6, default: 1 },
        mealPeriods: {
          type: [String],
          enum: ['breakfast', 'lunch', 'dinner'],
          default: ['dinner'],
        },
        fulfillmentMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
      },
      notifyOrderUpdates: { type: Boolean, default: true },
      notifyDeliveryReminders: { type: Boolean, default: true },
      notifyContractRenewal: { type: Boolean, default: true },
      notifyReviewReminders: { type: Boolean, default: true },
      notifyMarketing: { type: Boolean, default: false },
      notificationQuietHoursStart: { type: String, default: '22:00' },
      notificationQuietHoursEnd: { type: String, default: '07:00' },
    },
    contractTerms: {
      customMinimumOrderCents: { type: Number, min: 0 },
      customDeliveryRadiusKm: { type: Number, min: 1 },
      customPlatformFeePercent: { type: Number, min: 0, max: 100 },
      contractStartDate: Date,
      contractEndDate: Date,
      isActive: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
OrganizationSchema.index({ 'address.coordinates': '2dsphere' });

const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;

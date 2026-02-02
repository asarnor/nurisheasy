import mongoose, { Schema, Document, Model } from 'mongoose';

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

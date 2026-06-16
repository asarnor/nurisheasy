import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMenuItem extends Document {
  vendorId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number; // Stored in cents
  isAvailable: boolean;
  allergenTags: string[];
  ingredients: string[];
  lastVerifiedAt: Date;
  imageUrl?: string;
  mealCategories?: ('breakfast' | 'lunch' | 'dinner')[];
  category?: string; // legacy display label
  stockQuantity?: number | null; // null = unlimited / not tracked
  servingSizeOz?: number;
  maxPortionsPerOrder?: number; // Per-item override for portion protocols
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    allergenTags: {
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
    ingredients: {
      type: [String],
      default: [],
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    imageUrl: String,
    mealCategories: {
      type: [String],
      enum: ['breakfast', 'lunch', 'dinner'],
      default: ['dinner'],
      index: true,
    },
    category: String,
    stockQuantity: {
      type: Number,
      default: null,
      min: 0,
    },
    servingSizeOz: {
      type: Number,
      default: null,
      min: 0,
    },
    maxPortionsPerOrder: {
      type: Number,
      default: null,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient menu queries
MenuItemSchema.index({ vendorId: 1, isAvailable: 1 });
MenuItemSchema.index({ allergenTags: 1 });

const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export default MenuItem;

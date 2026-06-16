import mongoose, { Schema, Document, Model } from 'mongoose';
import Organization from './organization.model';
import MenuItem from './menu.model';

export interface ISubOrder {
  vendorId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'REFUNDED' | 'CANCELLED';
  items: Array<{
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number; // Price per item in cents
  }>;
  vendorTotal: number; // Total for this vendor in cents
  acceptedAt?: Date;
  estimatedReadyAt?: Date;
}

export interface IOrder extends Document {
  consumerId: mongoose.Types.ObjectId;
  status: 'PROCESSING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';
  paymentIntentId: string;
  totalAmount: number; // Total order amount in cents
  platformFee: number; // Platform fee in cents (10%)
  subOrders: ISubOrder[];
  contractDurationMonths?: 3 | 6 | 9 | 12;
  preparationDayOfWeek?: number;
  mealPeriods?: ('breakfast' | 'lunch' | 'dinner')[];
  fulfillmentMethod?: 'pickup' | 'delivery';
  deliveryFeeCents?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubOrderSchema: Schema = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'REFUNDED', 'CANCELLED'],
      default: 'PENDING',
    },
    items: [
      {
        menuItemId: {
          type: Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true,
        },
        name: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    vendorTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    acceptedAt: Date,
    estimatedReadyAt: Date,
  },
  { _id: false }
);

const OrderSchema: Schema = new Schema(
  {
    consumerId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'CONFIRMED', 'FULFILLED', 'CANCELLED', 'REFUNDED'],
      default: 'PROCESSING',
    },
    paymentIntentId: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    subOrders: [SubOrderSchema],
    contractDurationMonths: {
      type: Number,
      enum: [3, 6, 9, 12],
    },
    preparationDayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    mealPeriods: {
      type: [String],
      enum: ['breakfast', 'lunch', 'dinner'],
    },
    fulfillmentMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
    },
    deliveryFeeCents: {
      type: Number,
      min: 0,
      default: 0,
    },
    contractStartDate: Date,
    contractEndDate: Date,
  },
  {
    timestamps: true,
  }
);

// THE SAFETY GATE - Mongoose Pre-Save Middleware
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const order = this as unknown as IOrder;
      const groupHome = await Organization.findById(order.consumerId);
      
      if (!groupHome) {
        return next(new Error('Consumer organization not found'));
      }

      if (groupHome.type !== 'consumer') {
        return next(new Error('Invalid consumer organization'));
      }

      const bannedTags = groupHome.safetyProfile.criticalAllergens;

      // Check EVERY item in EVERY subOrder
      for (const subOrder of order.subOrders) {
        for (const item of subOrder.items) {
          const menuItem = await MenuItem.findById(item.menuItemId);
          
          if (!menuItem) {
            return next(new Error(`MenuItem ${item.menuItemId} not found`));
          }

          // INTERSECTION CHECK - If any allergen tag matches a banned tag, BLOCK
          const hasBanned = menuItem.allergenTags.some((tag) =>
            bannedTags.includes(tag)
          );

          if (hasBanned) {
            return next(
              new Error(
                `SAFETY BLOCK: Item "${menuItem.name}" contains ${menuItem.allergenTags.join(', ')} which violates restriction: ${bannedTags.join(', ')}`
              )
            );
          }
        }
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Index for efficient order queries
OrderSchema.index({ consumerId: 1, createdAt: -1 });
OrderSchema.index({ paymentIntentId: 1 });
OrderSchema.index({ 'subOrders.vendorId': 1 });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;

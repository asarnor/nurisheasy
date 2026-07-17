import mongoose, { Schema, Document, Model } from 'mongoose';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';

export interface IContractItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number; // Cents
}

export interface IContractPricingTerms {
  platformFeePercent: number;
  minimumOrderCents: number;
  contractFeeCents: number;
}

export interface IContract extends Document {
  consumerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  durationMonths: 3 | 6 | 9 | 12;
  startDate: Date;
  endDate: Date;
  preparationDayOfWeek: number;
  mealPeriods: ('breakfast' | 'lunch' | 'dinner')[];
  fulfillmentMethod: 'pickup' | 'delivery';
  pricingTerms: IContractPricingTerms;
  status: ContractStatus;
  items?: IContractItem[];
  lastGeneratedPrepDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContractItemSchema: Schema = new Schema(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ContractPricingTermsSchema: Schema = new Schema(
  {
    platformFeePercent: { type: Number, required: true, min: 0, max: 100, default: 10 },
    minimumOrderCents: { type: Number, required: true, min: 0, default: 2000 },
    contractFeeCents: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const ContractSchema: Schema = new Schema(
  {
    consumerId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    durationMonths: {
      type: Number,
      enum: [3, 6, 9, 12],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    preparationDayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
      index: true,
    },
    mealPeriods: {
      type: [String],
      enum: ['breakfast', 'lunch', 'dinner'],
      default: [],
    },
    fulfillmentMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
    },
    pricingTerms: {
      type: ContractPricingTermsSchema,
      required: true,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    items: {
      type: [ContractItemSchema],
      default: [],
    },
    lastGeneratedPrepDate: Date,
  },
  {
    timestamps: true,
  }
);

ContractSchema.index({ consumerId: 1, vendorId: 1, status: 1 });
ContractSchema.index({ status: 1, preparationDayOfWeek: 1 });

const Contract: Model<IContract> =
  (mongoose.models.Contract as Model<IContract>) ||
  mongoose.model<IContract>('Contract', ContractSchema);

export default Contract;

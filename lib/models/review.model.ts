import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  consumerId: mongoose.Types.ObjectId;
  consumerName?: string;
  rating: number;
  comment?: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
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
    consumerName: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    fulfillmentMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ vendorId: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1, vendorId: 1 }, { unique: true });

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;

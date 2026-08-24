import { Schema, Types, model } from 'mongoose';

export interface ReviewDocument {
  user: Types.ObjectId;
  book: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    book: { type: Types.ObjectId, ref: 'Book', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000, default: '' }
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, book: 1 }, { unique: true });
export const Review = model<ReviewDocument>('Review', reviewSchema);

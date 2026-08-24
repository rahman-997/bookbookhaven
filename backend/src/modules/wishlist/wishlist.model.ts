import { Schema, Types, model } from 'mongoose';

export interface WishlistDocument {
  user: Types.ObjectId;
  books: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<WishlistDocument>(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    books: [{ type: Types.ObjectId, ref: 'Book', required: true }]
  },
  { timestamps: true }
);

export const Wishlist = model<WishlistDocument>('Wishlist', wishlistSchema);

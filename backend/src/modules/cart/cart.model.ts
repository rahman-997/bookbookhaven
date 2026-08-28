import { Schema, Types, model } from 'mongoose';

interface CartItem {
  book: Types.ObjectId;
  quantity: number;
  unitPrice: number;
}

export interface CartDocument {
  user: Types.ObjectId;
  items: CartItem[];
  checkoutLockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    book: { type: Types.ObjectId, ref: 'Book', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const cartSchema = new Schema<CartDocument>(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    checkoutLockedAt: { type: Date, default: null }
  },
  { timestamps: true, optimisticConcurrency: true }
);

export const Cart = model<CartDocument>('Cart', cartSchema);

import { Schema, Types, model } from 'mongoose';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'manual';

interface OrderItem {
  book: Types.ObjectId;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDocument {
  user: Types.ObjectId;
  items: OrderItem[];
  subtotal: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>({
  book: { type: Types.ObjectId, ref: 'Book', required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new Schema<OrderDocument>({
  user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'], default: 'pending', index: true },
  paymentMethod: { type: String, enum: ['cash_on_delivery', 'manual'], default: 'cash_on_delivery' },
  shippingAddress: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
export const Order = model<OrderDocument>('Order', orderSchema);

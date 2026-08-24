import { Schema, model } from 'mongoose';

export interface BookDocument {
  title: string;
  slug: string;
  author: string;
  description: string;
  coverUrl?: string;
  isbn?: string;
  price: number;
  stock: number;
  categories: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<BookDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    author: { type: String, required: true, trim: true, maxlength: 160, index: true },
    description: { type: String, default: '', maxlength: 5000 },
    coverUrl: { type: String, trim: true },
    isbn: { type: String, trim: true, unique: true, sparse: true },
    price: { type: Number, required: true, min: 0, index: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    categories: [{ type: String, trim: true, lowercase: true }],
    featured: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', description: 'text' });

export const Book = model<BookDocument>('Book', bookSchema);

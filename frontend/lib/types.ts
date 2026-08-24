export type Book = {
  _id: string;
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
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = {
  book: Book;
  quantity: number;
  unitPrice: number;
};

export type Review = {
  _id: string;
  rating: number;
  comment: string;
  user: { _id?: string; name: string };
  createdAt: string;
};

export type Order = {
  _id: string;
  items: Array<{ book: string; title: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
  paymentMethod: 'cash_on_delivery' | 'manual';
  shippingAddress: string;
  createdAt: string;
  user?: { name: string; email: string };
};

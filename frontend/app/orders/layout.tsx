import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Orders',
  '/orders',
  'Review your private BookHaven order history.'
);

export default function OrdersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

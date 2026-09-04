import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Cart',
  '/cart',
  'Review the books in your private BookHaven cart.'
);

export default function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

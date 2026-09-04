import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Checkout',
  '/checkout',
  'Complete your private BookHaven checkout.'
);

export default function CheckoutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

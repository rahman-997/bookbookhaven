import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Wishlist',
  '/wishlist',
  'Review the books saved to your private BookHaven wishlist.'
);

export default function WishlistLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

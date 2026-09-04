import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Create account',
  '/register',
  'Create a BookHaven reader account for saved books, reviews and orders.'
);

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Account',
  '/account',
  'Manage your private BookHaven reader account.'
);

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

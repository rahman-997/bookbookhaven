import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Admin',
  '/admin',
  'Private BookHaven administration workspace.'
);

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

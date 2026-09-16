import { privatePageMetadata } from '@/lib/private-metadata';

export const metadata = privatePageMetadata(
  'Sign in',
  '/login',
  'Sign in to your private BookHaven reading space.'
);

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

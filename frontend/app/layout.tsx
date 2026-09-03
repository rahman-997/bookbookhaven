import type { Metadata, Viewport } from 'next';
import './globals.css';
import './accessibility.css';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'BookHaven — Find your next chapter', template: '%s · BookHaven' },
  description: 'A premium, modern bookstore for discovering, saving, reviewing and ordering books.',
  applicationName: 'BookHaven',
  openGraph: { title: 'BookHaven', description: 'Find your next chapter.', type: 'website', siteName: 'BookHaven' },
  twitter: { card: 'summary_large_image', title: 'BookHaven', description: 'Find your next chapter.' },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { themeColor: '#060912', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main-content" className="skip-link">Skip to main content</a><Header /><div id="main-content" tabIndex={-1} className="min-h-[calc(100vh-220px)]">{children}</div><Footer /><MobileNav /></body></html>;
}

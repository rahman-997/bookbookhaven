'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartIcon, HeartIcon, HomeIcon, PackageIcon, UserIcon } from './Icons';

const items = [
  { href: '/', label: 'Discover', Icon: HomeIcon },
  { href: '/wishlist', label: 'Saved', Icon: HeartIcon },
  { href: '/cart', label: 'Cart', Icon: CartIcon },
  { href: '/orders', label: 'Orders', Icon: PackageIcon },
  { href: '/account', label: 'You', Icon: UserIcon }
];

export default function MobileNav() {
  const pathname = usePathname();
  return <nav aria-label="Mobile navigation" className="mobile-dock md:hidden">
    {items.map(({ href, label, Icon }) => {
      const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
      return <Link key={href} href={href} className={`mobile-dock__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
        <Icon size={20} />
        <span>{label}</span>
      </Link>;
    })}
  </nav>;
}

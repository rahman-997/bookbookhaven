import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightIcon, BookIcon } from './Icons';

export default function EmptyState({ title, description, href = '/', action = 'Explore the library', icon }: { title: string; description: string; href?: string; action?: string; icon?: ReactNode }) {
  return <div className="empty-state">
    <div className="empty-state__icon">{icon ?? <BookIcon size={28} />}</div>
    <h2>{title}</h2>
    <p>{description}</p>
    <Link href={href} className="button button--primary">{action}<ArrowRightIcon size={17} /></Link>
  </div>;
}

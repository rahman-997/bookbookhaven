import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
}

export function HomeIcon(props: IconProps) { return <Icon {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/></Icon>; }
export function HeartIcon(props: IconProps) { return <Icon {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></Icon>; }
export function CartIcon(props: IconProps) { return <Icon {...props}><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.5 11h10.8l2-8H6.1"/></Icon>; }
export function UserIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>; }
export function SearchIcon(props: IconProps) { return <Icon {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Icon>; }
export function ArrowRightIcon(props: IconProps) { return <Icon {...props}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></Icon>; }
export function SparkleIcon(props: IconProps) { return <Icon {...props}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></Icon>; }
export function BagIcon(props: IconProps) { return <Icon {...props}><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></Icon>; }
export function BookIcon(props: IconProps) { return <Icon {...props}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v18h4.5A2.5 2.5 0 0 1 20 22V4.5Z"/></Icon>; }
export function StarIcon(props: IconProps) { return <Icon {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></Icon>; }
export function ShieldIcon(props: IconProps) { return <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></Icon>; }
export function MenuIcon(props: IconProps) { return <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16"/></Icon>; }
export function XIcon(props: IconProps) { return <Icon {...props}><path d="m6 6 12 12M18 6 6 18"/></Icon>; }
export function PackageIcon(props: IconProps) { return <Icon {...props}><path d="m3 7 9 5 9-5-9-5-9 5Z"/><path d="m3 7 9 5v10l-9-5V7Zm18 0-9 5v10l9-5V7Z"/></Icon>; }
export function ChevronLeftIcon(props: IconProps) { return <Icon {...props}><path d="m15 18-6-6 6-6"/></Icon>; }
export function CheckIcon(props: IconProps) { return <Icon {...props}><path d="m5 12 4 4L19 6"/></Icon>; }
export function MinusIcon(props: IconProps) { return <Icon {...props}><path d="M5 12h14"/></Icon>; }
export function PlusIcon(props: IconProps) { return <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>; }
export function TrashIcon(props: IconProps) { return <Icon {...props}><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/></Icon>; }

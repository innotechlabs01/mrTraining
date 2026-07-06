'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Zm9.75 0A2.25 2.25 0 0 1 16 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H16A2.25 2.25 0 0 1 13.75 18v-2.25Zm0-9.75A2.25 2.25 0 0 1 16 3.75h2.25A2.25 2.25 0 0 1 20.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H16a2.25 2.25 0 0 1-2.25-2.25V6Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/workouts',
    label: 'Workouts',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[260px] flex flex-col z-50"
      style={{
        backgroundColor: '#0A0B0D',
        borderRight: '1px solid rgba(255, 107, 0, 0.15)',
      }}
    >
      <div className="px-6 py-6">
        <Link href="/" className="font-display-xl text-xl font-black italic tracking-tighter">
          <span className="text-electric-orange">MR</span>{' '}
          <span className="text-pure-white">TRAINING</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-[3px] border-electric-orange text-electric-orange bg-electric-orange/10'
                  : 'border-l-[3px] border-transparent text-on-surface-variant hover:text-pure-white hover:bg-white/5'
              }`}
            >
              {link.icon}
              <span className="font-label-bold uppercase tracking-wider">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 border-t border-white/10">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-9 h-9',
            },
          }}
        />
      </div>
    </aside>
  );
}

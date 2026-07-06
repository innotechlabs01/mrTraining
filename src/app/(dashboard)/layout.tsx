import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/workouts', label: 'Workouts' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/billing', label: 'Billing' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter flex justify-between items-center h-16">
          <Link
            href="/"
            className="font-display-xl text-xl font-black italic text-electric-orange tracking-tighter"
          >
            MR TRAINING
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            {DASHBOARD_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-on-surface hover:text-electric-orange font-label-bold text-sm uppercase tracking-wider transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </nav>
      <main className="pt-16">{children}</main>
    </div>
  );
}

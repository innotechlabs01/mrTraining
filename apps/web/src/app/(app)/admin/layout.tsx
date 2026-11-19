'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  TicketCheck,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Nav items carry no counts: the previous badges rendered hardcoded numbers
// ("3", "12", "4") that were not backed by any data.
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/coaches', label: 'Coaches', icon: Users },
  { href: '/admin/tickets', label: 'Tickets/Soporte', icon: TicketCheck },
  { href: '/admin/plans', label: 'Planes', icon: CreditCard },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
];

// 02-design-system.md §2.4: top bar 56px, sidebar 240px (64px icon-only).
const TOP_BAR_HEIGHT = 'h-14';
const SIDEBAR_OPEN_WIDTH = 'w-60';
const SIDEBAR_CLOSED_WIDTH = 'w-16';
const CONTENT_OFFSET_OPEN = 'lg:pl-60';
const CONTENT_OFFSET_CLOSED = 'lg:pl-16';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0';

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 overflow-hidden">
      <span className="text-base font-extrabold leading-none tracking-tight text-brand-primary">
        MR
      </span>
      {!compact && (
        <span className="truncate text-sm font-bold uppercase leading-none tracking-[0.18em] text-text-primary">
          Training
        </span>
      )}
    </span>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
        FOCUS_RING,
        collapsed && 'justify-center px-0',
        active
          ? 'bg-surface-4 font-medium text-brand-primary'
          : 'text-text-secondary hover:bg-surface-4 hover:text-text-primary',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-primary"
        />
      )}
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Super admin is the env allow-list OR Clerk publicMetadata.role — the exact
  // same rule middleware.ts and the sign-in page use. Checking only the env
  // list here disagreed with every other layer and locked out admins that only
  // carry the metadata role.
  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';

  useEffect(() => {
    if (!isLoaded || !user || isSuperAdmin) return;
    // Wrong role: leave the admin area for the landing page. Pushing /coach
    // here just bounced straight back through the middleware gate.
    router.replace('/');
  }, [isLoaded, user, isSuperAdmin, router]);

  const currentItem = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + '/'),
  );
  const currentLabel =
    pathname === '/admin' ? 'Vista de plataforma' : currentItem?.label ?? 'Dashboard';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    router.replace('/sign-in');
  };

  // Never render an empty viewport: a blank screen while Clerk resolves reads
  // as a broken app. Keep the shell dimensions and show a spinner instead.
  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-surface-6 border-t-brand-primary"
          role="status"
          aria-label="Cargando"
        />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-0 p-6 text-center">
        <h1 className="text-h3 font-semibold text-text-primary">Acceso denegado</h1>
        <p className="max-w-sm text-body-sm text-text-secondary">
          Esta sección es exclusiva del super admin de la plataforma.
        </p>
        <a
          href="/"
          className={cn(
            'mt-2 inline-flex items-center justify-center rounded-lg bg-brand-primary px-5 py-3 text-body-sm font-medium text-text-inverse transition-colors hover:bg-brand-primary-pressed',
            FOCUS_RING,
          )}
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  const displayName =
    user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Super Admin';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Desktop sidebar — hidden on mobile, where the drawer handles navigation. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-surface-6 bg-surface-2 transition-[width] duration-300 ease-out lg:flex',
          sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH,
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-surface-6 px-4',
            TOP_BAR_HEIGHT,
            !sidebarOpen && 'justify-center px-0',
          )}
        >
          <Link
            href="/admin/dashboard"
            aria-label="MR Training — inicio del panel"
            className={cn('rounded-md', FOCUS_RING)}
          >
            <BrandLockup compact={!sidebarOpen} />
          </Link>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={currentItem?.href === item.href}
                  collapsed={!sidebarOpen}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-surface-6 p-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary',
              FOCUS_RING,
              !sidebarOpen && 'justify-center px-0',
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft size={20} className="shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight size={20} className="shrink-0" aria-hidden="true" />
            )}
            {sidebarOpen && <span className="truncate">Colapsar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <aside
            aria-label="Navegación del panel"
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-surface-6 bg-surface-2 lg:hidden"
          >
              <div className={cn('flex shrink-0 items-center justify-between border-b border-surface-6 px-4', TOP_BAR_HEIGHT)}>
                <BrandLockup />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary',
                    FOCUS_RING,
                  )}
                >
                  <X size={20} />
                </button>
              </div>
              <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <NavItem
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={currentItem?.href === item.href}
                        onNavigate={() => setMobileMenuOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
            <div className="shrink-0 border-t border-surface-6 p-2">
              <button
                onClick={handleSignOut}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary',
                  FOCUS_RING,
                )}
              >
                <LogOut size={18} className="shrink-0" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Top bar — 56px, fixed, no duplicated page title: pages own their H1. */}
      <header
        className={cn(
          'fixed right-0 top-0 z-30 flex items-center border-b border-surface-6 bg-surface-1 transition-[left] duration-300 ease-out',
          TOP_BAR_HEIGHT,
          'left-0',
          sidebarOpen ? 'lg:left-60' : 'lg:left-16',
        )}
      >
        <div className="flex h-full w-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary lg:hidden',
                FOCUS_RING,
              )}
            >
              <Menu size={20} />
            </button>
            <span className="flex min-w-0 items-center gap-2 text-sm lg:hidden">
              <BrandLockup compact />
              <span className="sr-only">MR Training — panel de plataforma</span>
            </span>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
              <Link
                href="/admin/dashboard"
                className={cn('rounded text-text-secondary transition-colors hover:text-text-primary', FOCUS_RING)}
              >
                Admin
              </Link>
              <span aria-hidden="true" className="text-text-secondary/60">
                /
              </span>
              <span aria-current="page" className="truncate font-medium text-text-primary">
                {currentLabel}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold uppercase text-text-primary"
              >
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[160px] truncate text-sm font-medium text-text-primary">
                  {displayName}
                </span>
                <span className="block text-xs text-text-secondary">Super Admin</span>
              </span>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary',
                FOCUS_RING,
              )}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'min-h-screen bg-surface-0 pt-14 transition-[padding] duration-300 ease-out',
          sidebarOpen ? CONTENT_OFFSET_OPEN : CONTENT_OFFSET_CLOSED,
        )}
      >
        <div className="mx-auto w-full max-w-[1280px] p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

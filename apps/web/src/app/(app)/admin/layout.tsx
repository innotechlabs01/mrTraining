'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  Bell,
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

const SIDEBAR_OPEN_WIDTH = 260;
const SIDEBAR_CLOSED_WIDTH = 72;

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

  // Never render an empty viewport: a blank screen while Clerk resolves reads
  // as a broken app. Keep the shell dimensions and show a spinner instead.
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"
          role="status"
          aria-label="Cargando"
        ></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-h3 font-semibold text-text-primary">Acceso denegado</h1>
        <p className="text-body-sm text-text-secondary max-w-sm">
          Esta sección es exclusiva del super admin de la plataforma.
        </p>
        <a
          href="/"
          className="mt-2 inline-flex items-center justify-center rounded-md bg-brand-primary px-5 py-3 text-body-sm font-medium text-text-inverse transition-colors hover:bg-brand-primary-hover"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  const sidebarWidth = sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    router.replace('/sign-in');
  };

  return (
    <div className="min-h-screen bg-surface-0 relative">
      {/* Desktop sidebar (collapsible, hidden on mobile — the mobile drawer handles navigation there) */}
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarWidth, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="hidden lg:flex fixed left-0 top-0 h-screen bg-surface-1 border-r border-surface-6 z-50 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-surface-6 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-text-inverse font-bold text-sm">
              M
            </div>
            <span className={cn('sidebar-text truncate', !sidebarOpen && 'hidden')}>
              MR<span className="text-brand-primary">Training</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
            aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  !sidebarOpen && 'justify-center',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                  !sidebarOpen && 'px-0',
                )}>
                <Icon size={20} className="shrink-0" aria-hidden="true" />
                <span className={cn('sidebar-text truncate', !sidebarOpen && 'hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-surface-6 shrink-0">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-surface-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm shrink-0">
              {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'A'}
            </div>
            <div className={cn('flex-1 min-w-0', !sidebarOpen && 'hidden')}>
              <p className="text-sm font-medium text-text-primary truncate">{user?.firstName || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'Super Admin'}</p>
              <p className="text-xs text-text-secondary truncate">Super Admin</p>
            </div>
            <button className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0" aria-label="Cerrar sesión" onClick={handleSignOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed inset-y-0 right-0 h-screen w-full max-w-md bg-surface-1 border-l border-surface-6 z-50 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-surface-6 shrink-0">
                <span className="text-lg font-bold text-text-primary">MR Training</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto shrink-0">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                        pathname === item.href || pathname.startsWith(item.href + '/')
                          ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                      )}>
                      <Icon size={20} className="shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-surface-6 shrink-0">
                <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors" aria-label="Cerrar sesión">
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <header className={cn('fixed top-0 h-16 bg-surface-0/80 backdrop-blur-md border-b border-surface-6 z-50 flex-all transition-all duration-300', sidebarOpen ? 'lg:left-[260px] lg:w-[calc(100%-260px)] lg:right-0' : 'lg:left-[72px] lg:w-[calc(100%-72px)] lg:right-0')}>
        <div className="flex items-center justify-between h-full px-6 lg:pr-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors" aria-label="Abrir menú">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-text-primary hidden sm:block">
              {NAV_ITEMS.find(i => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors" aria-label="Notificaciones">
                <Bell size={20} />
              </button>
            </div>
            <div className="relative">
              <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-2 transition-colors" aria-label="Menú de usuario">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                  {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-text-primary">{user?.firstName || 'Admin'}</p>
                  <p className="text-xs text-text-secondary">Super Admin</p>
                </div>
                <ChevronLeft size={16} className="text-text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn('min-h-screen bg-surface-0 pt-16 transition-all duration-300', sidebarOpen ? 'lg:ml-[260px] lg:w-[calc(100%-260px)]' : 'lg:ml-[72px] lg:w-[calc(100%-72px)]')}>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      <button onClick={() => setMobileMenuOpen(true)} className="fixed bottom-6 right-6 lg:hidden z-50 p-4 rounded-full bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/30" aria-label="Abrir menú">
        <Menu size={24} />
      </button>
    </div>
  );
}

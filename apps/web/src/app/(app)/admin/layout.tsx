'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
  X,
  Flame,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FitFlowSidebar, FITFLOW_NAV_ITEMS } from '@/components/admin/FitFlowSidebar';
import { FitFlowHeader } from '@/components/admin/FitFlowHeader';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { LoyaltyModal } from '@/components/admin/LoyaltyModal';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A3D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F12]';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [loyaltyModalOpen, setLoyaltyModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('month');

  // Load sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fitflow_admin_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fitflow_admin_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '')
    .split(',')
    .filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';

  useEffect(() => {
    if (!isLoaded || !user || isSuperAdmin) return;
    router.replace('/');
  }, [isLoaded, user, isSuperAdmin, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    router.replace('/sign-in');
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F12]">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[#26262B] border-t-[#E07A3D]"
          role="status"
          aria-label="Cargando panel de administración"
        />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0F0F12] p-6 text-center text-white">
        <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
        <p className="max-w-sm text-sm text-[#8E8E93]">
          Esta sección es exclusiva del Super Admin de la plataforma.
        </p>
        <a
          href="/"
          className={cn(
            'mt-2 inline-flex items-center justify-center rounded-xl bg-[#E07A3D] px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-[#D0692D] transition-colors',
            FOCUS_RING
          )}
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  const displayName =
    user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Emon';
  const avatarUrl = user.imageUrl;

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white selection:bg-[#E07A3D]/30 selection:text-white">
      {/* Desktop Sidebar */}
      <FitFlowSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onSignOut={handleSignOut}
        onUpgradePlanClick={() => setLoyaltyModalOpen(true)}
      />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          />
          <aside
            aria-label="Navegación del panel móvil"
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-[#26262B] bg-[#0F0F12]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#26262B] px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E07A3D] text-white">
                  <Flame size={18} className="fill-white" />
                </div>
                <span className="text-lg font-black text-white">
                  Fit<span className="text-[#E07A3D]">flow</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-[#8E8E93] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {FITFLOW_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href)) ||
                  (item.href === '/admin/dashboard' && pathname === '/admin');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-[#2A1D17] text-white font-bold'
                        : 'text-[#8E8E93] hover:bg-[#1A1A1F] hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={isActive ? 'text-[#E07A3D]' : 'text-[#8E8E93]'}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-[#202026] px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#26262B] p-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-[#1A1A1F]"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-[padding] duration-300 ease-out',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        {/* Top Header */}
        <FitFlowHeader
          displayName={displayName}
          avatarUrl={avatarUrl}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onSignOut={handleSignOut}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Page Content Viewport */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenLoyaltyModal={() => setLoyaltyModalOpen(true)}
      />

      {/* Global Loyalty Setup Wizard */}
      <LoyaltyModal
        open={loyaltyModalOpen}
        onClose={() => setLoyaltyModalOpen(false)}
      />
    </div>
  );
}

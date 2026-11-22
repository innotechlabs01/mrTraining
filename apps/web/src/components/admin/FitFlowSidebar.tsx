'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  TicketCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItemConfig {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
  badgeColor?: string;
}

export const FITFLOW_NAV_ITEMS: NavItemConfig[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/coaches', label: 'Coaches', icon: Users },
  { href: '/admin/plans', label: 'Planes Coach', icon: CreditCard },
  { href: '/admin/billing', label: 'Facturación', icon: Receipt },
  { href: '/admin/tickets', label: 'Tickets / Soporte', icon: TicketCheck },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
];

interface FitFlowSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
}

export function FitFlowSidebar({
  collapsed,
  onToggleCollapse,
  onSignOut,
}: FitFlowSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#26262B] bg-[#0F0F12] text-white transition-[width] duration-300 ease-out lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Brand Logo Header */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-[#26262B] px-5',
          collapsed ? 'justify-center px-0' : 'justify-between'
        )}
      >
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2.5 overflow-hidden group"
          title="FitFlow Super Admin"
        >
          {/* Logo Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E07A3D] to-[#F97316] text-white shadow-md shadow-[#E07A3D]/20">
            <Flame size={20} className="fill-white" />
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-white group-hover:text-[#E07A3D] transition-colors">
                Fit<span className="text-[#E07A3D]">flow</span>
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Menu List */}
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
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[#2A1D17] text-white font-bold'
                  : 'text-[#8E8E93] hover:bg-[#1A1A1F] hover:text-[#D1D1D6]'
              )}
            >
              {/* Left active border indicator */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-[#E07A3D]"
                />
              )}

              <Icon
                size={18}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-[#E07A3D]' : 'text-[#8E8E93] group-hover:text-white'
                )}
              />

              {!collapsed && (
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        'ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white',
                        item.badgeColor || 'bg-[#26262B]'
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Sticky Section */}
      <div className="shrink-0 border-t border-[#26262B] p-3">
        {/* Log Out & Collapse controls */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              'flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#8E8E93] hover:bg-[#1A1A1F] hover:text-white transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title="Log Out"
          >
            <LogOut size={16} />
            {!collapsed && <span>Log Out</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8E8E93] hover:bg-[#1A1A1F] hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

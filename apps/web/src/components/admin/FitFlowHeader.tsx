'use client';

import { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FitFlowHeaderProps {
  displayName?: string;
  avatarUrl?: string;
  onOpenCommandPalette: () => void;
  onSignOut: () => void;
  onToggleMobileMenu: () => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export function FitFlowHeader({
  displayName = 'Emon',
  avatarUrl,
  onOpenCommandPalette,
  onSignOut,
  onToggleMobileMenu,
  dateRange,
  onDateRangeChange,
}: FitFlowHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = [
    {
      id: 'n1',
      title: 'Nuevo Miembro Registrado',
      desc: 'Carlos Mendoza adquirió Membresía Platinum.',
      time: 'Hace 5m',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Batch Schedule Actualizado',
      desc: 'Entrenador asignado a Cross Training 07:00.',
      time: 'Hace 25m',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Facturación Wompi',
      desc: '14 cobros recurrentes procesados con éxito.',
      time: 'Hace 1h',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#26262B] bg-[#0F0F12]/90 px-4 sm:px-8 backdrop-blur-md">
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={onToggleMobileMenu}
        aria-label="Abrir navegación"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#26262B] text-[#8E8E93] hover:text-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Search Input Bar matching screenshot */}
      <div className="flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-full border border-[#26262B] bg-[#16161A] px-4 py-2.5 text-xs text-[#8E8E93] shadow-inner transition-colors hover:border-[#383842] hover:text-[#D1D1D6]"
        >
          <div className="flex items-center gap-2.5">
            <Search size={16} className="text-[#8E8E93]" />
            <span>Find something here...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-[#202026] px-2 py-0.5 text-[10px] font-mono text-[#71717A]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4 ml-4">
        {/* Global Date Filter dropdown */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#26262B] bg-[#16161A] px-3 py-1.5 text-xs text-[#D1D1D6]">
          <Calendar size={13} className="text-[#E07A3D]" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#D1D1D6] focus:outline-none cursor-pointer"
          >
            <option value="today" className="bg-[#16161A] text-white">Hoy</option>
            <option value="week" className="bg-[#16161A] text-white">Últimos 7 días</option>
            <option value="month" className="bg-[#16161A] text-white">Este mes</option>
            <option value="year" className="bg-[#16161A] text-white">Año 2026</option>
          </select>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
            }}
            aria-label="Notificaciones"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#26262B] bg-[#16161A] text-[#8E8E93] hover:border-[#383842] hover:text-white transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#E07A3D] ring-2 ring-[#0F0F12]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[#26262B] bg-[#16161A] p-3 text-white shadow-2xl animate-in zoom-in-95 z-50">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-2 px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Notificaciones
                </span>
                <span className="rounded-full bg-[#E07A3D]/20 px-2 py-0.5 text-[10px] font-bold text-[#E07A3D]">
                  2 Nuevas
                </span>
              </div>

              <div className="divide-y divide-[#222228] my-1">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 hover:bg-[#1E1E24] rounded-xl transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-white leading-tight">{n.title}</p>
                      <span className="text-[10px] text-[#71717A] shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile matching screenshot */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-3 rounded-full border border-transparent p-1 sm:px-2.5 sm:py-1 hover:border-[#26262B] hover:bg-[#16161A] transition-colors"
          >
            {/* User Avatar with fallbacks */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#26262B] bg-[#2A1D17] text-sm font-bold text-[#E07A3D]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span>{displayName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-tight">{displayName}</div>
              <div className="text-[10px] font-medium text-[#8E8E93]">Super Admin</div>
            </div>

            <ChevronDown size={14} className="hidden sm:block text-[#8E8E93]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-[#26262B] bg-[#16161A] p-1.5 text-xs text-white shadow-2xl animate-in zoom-in-95 z-50">
              <div className="border-b border-[#26262B] px-3 py-2 text-[11px] text-[#8E8E93]">
                Conectado como <strong className="text-white">{displayName}</strong>
              </div>
              <a
                href="/admin/settings"
                className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[#1E1E24] text-[#D1D1D6] hover:text-white transition-colors"
              >
                <Settings size={14} /> Configuración
              </a>
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-400 hover:bg-[#1E1E24] transition-colors"
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

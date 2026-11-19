'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  Receipt,
  TicketCheck,
  BarChart3,
  Columns3,
  Settings,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenLoyaltyModal?: () => void;
  onOpenKanbanModal?: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onOpenLoyaltyModal,
  onOpenKanbanModal,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard Overview', category: 'Navegación', href: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'coaches', label: 'Seguimiento de Coaches / Entrenadores', category: 'Navegación', href: '/admin/coaches', icon: Users },
    { id: 'plans', label: 'Creación y Gestión de Planes para Coaches', category: 'Navegación', href: '/admin/plans', icon: CreditCard },
    { id: 'members', label: 'Seguimiento de Miembros y Atletas', category: 'Navegación', href: '/admin/members', icon: UserCheck },
    { id: 'billing', label: 'Facturación y Cobro de Suscripciones', category: 'Navegación', href: '/admin/billing', icon: Receipt },
    { id: 'tickets', label: 'Tickets y Soporte a Coaches', category: 'Navegación', href: '/admin/tickets', icon: TicketCheck },
    { id: 'kanban', label: 'Tablero Kanban del Equipo', category: 'Navegación', href: '/admin/kanban', icon: Columns3 },
    { id: 'reports', label: 'Reportes y Analíticas de Plataforma', category: 'Navegación', href: '/admin/reports', icon: BarChart3 },
    { id: 'settings', label: 'Configuración y TRM', category: 'Navegación', href: '/admin/settings', icon: Settings },
  ];

  const quickActions = [
    {
      id: 'action-plans',
      label: 'Crear nuevo plan para coaches',
      category: 'Acciones Rápidas',
      href: '/admin/plans?action=create',
      icon: CreditCard,
    },
    {
      id: 'action-kanban',
      label: 'Crear nueva tarea interna en Kanban',
      category: 'Acciones Rápidas',
      action: () => {
        onClose();
        if (onOpenKanbanModal) {
          onOpenKanbanModal();
        } else {
          router.push('/admin/kanban?create=true');
        }
      },
      icon: Plus,
    },
    {
      id: 'action-loyalty',
      label: 'Configurar programa Loyalty Card para el club',
      category: 'Acciones Rápidas',
      action: () => {
        onClose();
        onOpenLoyaltyModal?.();
      },
      icon: Sparkles,
    },
    {
      id: 'action-settings-trm',
      label: 'Actualizar TRM y margen de cambio',
      category: 'Acciones Rápidas',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  const allItems = useMemo(() => {
    const list = [...navigationItems, ...quickActions];
    if (!query.trim()) return list;
    const lower = query.toLowerCase();
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allItems[selectedIndex];
        if (selected) {
          if ('action' in selected && typeof selected.action === 'function') {
            selected.action();
          } else if ('href' in selected && selected.href) {
            router.push(selected.href);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, selectedIndex, allItems, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#26262B] bg-[#141418] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 border-b border-[#26262B] px-4 py-3.5">
          <Search size={18} className="text-[#8E8E93] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas, coaches, planes o acciones (ej. Planes, TRM, Coaches)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#8E8E93] outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#8E8E93] hover:bg-[#202026] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8E8E93]">
              No se encontraron resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="space-y-1">
              {allItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        if ('action' in item && typeof item.action === 'function') {
                          item.action();
                        } else if ('href' in item && item.href) {
                          router.push(item.href);
                          onClose();
                        }
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-[#E07A3D]/15 text-[#E07A3D] font-medium'
                          : 'text-[#D1D1D6] hover:bg-[#1E1E24]'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg',
                            isSelected ? 'bg-[#E07A3D] text-white' : 'bg-[#202026] text-[#8E8E93]'
                          )}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-[#71717A] shrink-0 font-medium ml-2">
                        {item.category}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#26262B] bg-[#101014] px-4 py-2 text-xs text-[#71717A]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navegar</span>
            <span>↵ Seleccionar</span>
            <span>ESC Cerrar</span>
          </div>
          <span className="text-[#E07A3D] font-medium">FitFlow Super Admin</span>
        </div>
      </div>
    </div>
  );
}

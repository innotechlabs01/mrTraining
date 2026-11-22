'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Receipt,
  Search,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, Field } from '@/components/admin/ui';

interface RevenueStats {
  today?: number;
  this_month?: number;
  this_year?: number;
  total?: number;
}

interface CoachSummary {
  id: string;
  coach_id?: string;
  name: string;
  email: string;
  plan_name?: string;
  plan_status?: string;
  revenue_month?: number;
  revenue_total?: number;
  skip_subscription?: boolean;
}

interface FinancialAuditEvent {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_type: string;
  payload?: unknown;
  created_at: string;
}

function unwrapList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (obj.data && typeof obj.data === 'object') {
      const inner = obj.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as T[];
    }
  }
  return [];
}

function unwrapObject<T>(json: unknown): T | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as T;
  }
  return obj as unknown as T;
}

export default function AdminBillingPage() {
  const { getToken } = useAuth();
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<FinancialAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<FinancialAuditEvent | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBilling() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const base = process.env.NEXT_PUBLIC_GO_API_URL || '';

        const [revRes, coachesRes, auditRes] = await Promise.all([
          fetch(`${base}/api/v1/admin/revenue`, { cache: 'no-store', headers }),
          fetch(`${base}/api/v1/admin/coaches`, { cache: 'no-store', headers }),
          fetch(`${base}/api/v1/admin/financial-audit`, { cache: 'no-store', headers }),
        ]);

        if (!mounted) return;

        if (revRes.ok) {
          setRevenue(unwrapObject<RevenueStats>(await revRes.json()));
        }
        if (coachesRes.ok) {
          setCoaches(unwrapList<CoachSummary>(await coachesRes.json()));
        }
        if (auditRes.ok) {
          setAuditEvents(unwrapList<FinancialAuditEvent>(await auditRes.json()));
        }

        if (!revRes.ok && !coachesRes.ok && !auditRes.ok) {
          throw new Error('No se pudieron cargar los datos de facturación');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error cargando facturación');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadBilling();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  const entityTypes = useMemo(() => {
    const set = new Set(auditEvents.map((e) => e.entity).filter(Boolean));
    return Array.from(set);
  }, [auditEvents]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditEvents.filter((e) => {
      const matchSearch =
        !q ||
        e.entity?.toLowerCase().includes(q) ||
        e.entity_id?.toLowerCase().includes(q) ||
        e.action?.toLowerCase().includes(q) ||
        e.actor_id?.toLowerCase().includes(q);
      const matchEntity = entityFilter === 'all' || e.entity === entityFilter;
      return matchSearch && matchEntity;
    });
  }, [auditEvents, search, entityFilter]);

  const activeCoachesCount = coaches.filter((c) => c.plan_status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <Receipt size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Billing List & Facturación
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Ingresos reales de plataforma, estado de suscripciones de coaches y auditoría financiera.
          </p>
        </div>

        <a
          href="/admin/plans"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#26262B] bg-[#16161A] px-4 py-2.5 text-xs font-semibold text-[#D1D1D6] hover:bg-[#1E1E24] hover:text-white transition-colors"
        >
          <ExternalLink size={14} /> Configurar Planes y Precios
        </a>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-400">
          {error}
        </div>
      ) : null}

      {/* Financial Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Recaudado Este Mes
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400 tabular-nums">
            ${Number(revenue?.this_month ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">
            Hoy: ${Number(revenue?.today ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Recaudado Este Año
          </p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">
            ${Number(revenue?.this_year ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">
            Total: ${Number(revenue?.total ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Coaches Activos
          </p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">
            {activeCoachesCount}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">
            {coaches.length} registrados
          </p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Eventos de Auditoría
          </p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">
            {auditEvents.length}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Registro financiero</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#26262B] bg-[#16161A] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar entidad, acción o actor..."
              className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#E07A3D] focus:outline-none"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todas las entidades</option>
            {entityTypes.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[#8E8E93]">
          {filteredEvents.length} eventos registrados
        </span>
      </div>

      {/* Financial Audit Table */}
      <div className="overflow-hidden rounded-3xl border border-[#26262B] bg-[#16161A] shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#8E8E93]">
              Cargando registros de auditoría financiera...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E8E93]">
              No hay eventos de facturación o auditoría financiera registrados.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-white">
              <thead className="border-b border-[#26262B] bg-[#121216] text-[11px] uppercase tracking-wider text-[#71717A]">
                <tr>
                  <th className="px-5 py-3.5">Entidad</th>
                  <th className="px-5 py-3.5">Entidad ID</th>
                  <th className="px-5 py-3.5">Acción</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5 text-right">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#1B1B22] transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">{ev.entity}</td>
                    <td className="px-5 py-4 font-mono text-[#D1D1D6]">{ev.entity_id}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#26262B] px-2.5 py-1 text-[10px] font-bold text-[#D1D1D6]">
                        {ev.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#8E8E93]">
                      {ev.actor_type} ({ev.actor_id})
                    </td>
                    <td className="px-5 py-4 text-right text-[#8E8E93]">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#202026] hover:text-[#E07A3D] transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Coach Subscriptions Summary */}
      <div className="overflow-hidden rounded-3xl border border-[#26262B] bg-[#16161A] shadow-xl">
        <div className="border-b border-[#26262B] px-5 py-4">
          <h2 className="text-sm font-bold text-white">Resumen de Suscripciones por Coach</h2>
        </div>
        <div className="overflow-x-auto">
          {coaches.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8E8E93]">
              {loading ? 'Cargando coaches...' : 'No hay coaches registrados.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs text-white">
              <thead className="border-b border-[#26262B] bg-[#121216] text-[11px] uppercase tracking-wider text-[#71717A]">
                <tr>
                  <th className="px-5 py-3.5">Coach</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Ingresos Mes</th>
                  <th className="px-5 py-3.5 text-right">Ingresos Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {coaches.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1B1B22] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-[#71717A]">{c.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#D1D1D6]">{c.plan_name || 'Sin plan'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-bold capitalize',
                          c.plan_status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : c.skip_subscription
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        )}
                      >
                        {c.skip_subscription ? 'Omitido' : c.plan_status || 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-white">
                      ${Number(c.revenue_month ?? 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-white">
                      ${Number(c.revenue_total ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedEvent && (
        <Modal
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Evento de Auditoría: ${selectedEvent.action}`}
          description={`ID: ${selectedEvent.id}`}
        >
          <div className="grid grid-cols-2 gap-4 text-xs">
            <Field label="Entidad">{selectedEvent.entity}</Field>
            <Field label="Entidad ID">{selectedEvent.entity_id}</Field>
            <Field label="Actor">{selectedEvent.actor_type} ({selectedEvent.actor_id})</Field>
            <Field label="Fecha">
              {selectedEvent.created_at
                ? new Date(selectedEvent.created_at).toLocaleString('es-CO')
                : '—'}
            </Field>
          </div>
          {selectedEvent.payload !== undefined && (
            <pre className="mt-4 max-h-60 overflow-auto rounded-xl border border-[#26262B] bg-[#121216] p-3 text-[11px] text-[#D1D1D6]">
              {JSON.stringify(selectedEvent.payload, null, 2)}
            </pre>
          )}
        </Modal>
      )}
    </div>
  );
}

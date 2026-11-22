'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  Users,
  TrendingUp,
  Activity,
  Search as SearchIcon,
  Eye,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field, Modal } from '@/components/admin/ui';
import { MetricCard } from '@/components/admin/MetricCard';

interface CoachSummary {
  id: string;
  coach_id?: string;
  clerk_id?: string;
  email: string;
  name: string;
  role?: string;
  plan_name?: string;
  plan_price?: number;
  plan_max_athletes?: number;
  plan_status?: string;
  plan_expires_at?: string;
  athletes_count?: number;
  revenue_month?: number;
  revenue_total?: number;
  last_login?: string;
  skip_subscription?: boolean;
}

interface DashboardStats {
  coaches_count?: number;
  active_coaches_count?: number;
  users_count?: number;
  memberships_count?: number;
  active_memberships_count?: number;
  linked_athletes_count?: number;
  expiring_coaches_count?: number;
  skipped_subscriptions?: number;
}

interface RevenueStats {
  today?: number;
  this_month?: number;
  this_year?: number;
  total?: number;
  by_month?: { month: string; amount: number }[];
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCoach, setSelectedCoach] = useState<CoachSummary | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '')
    .split(',')
    .filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';
  const isLoaded = !!user;

  async function getAuthHeader(): Promise<{ [key: string]: string }> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: { ...(await getAuthHeader()), ...options.headers },
    });
    if (res.status === 401) {
      const newToken = await getToken();
      if (newToken) {
        res = await fetch(url, {
          cache: 'no-store',
          ...options,
          headers: { Authorization: `Bearer ${newToken}`, ...options.headers },
        });
      }
    }
    return res;
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_GO_API_URL || '';
      const [coachesRes, revenueRes, dashboardRes] = await Promise.all([
        fetchWithAuth(`${base}/api/v1/admin/coaches`),
        fetchWithAuth(`${base}/api/v1/admin/revenue`),
        fetchWithAuth(`${base}/api/v1/admin/dashboard`),
      ]);

      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(Array.isArray(data) ? data : data.data || []);
      }
      if (revenueRes.ok) setRevenueStats(await revenueRes.json());
      if (dashboardRes.ok) setDashboardStats(await dashboardRes.json());

      if (!coachesRes.ok && !revenueRes.ok && !dashboardRes.ok) {
        throw new Error('La API no respondió a las consultas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del CRM');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!isSuperAdmin) {
      router.replace('/');
      return;
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperAdmin, router]);

  const filteredCoaches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return coaches;
    return coaches.filter(
      (c) => c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term)
    );
  }, [coaches, search]);

  const totalCoaches = dashboardStats?.coaches_count ?? coaches.length;
  const activeCoaches =
    dashboardStats?.active_coaches_count ??
    coaches.filter((c) => c.plan_status === 'active').length;
  const totalUsers = dashboardStats?.users_count ?? 0;
  const linkedAthletes = dashboardStats?.linked_athletes_count ?? 0;
  const activeMemberships = dashboardStats?.active_memberships_count ?? 0;
  const expiringCoaches = dashboardStats?.expiring_coaches_count ?? 0;

  const totalRevenueMonth = coaches.reduce(
    (sum, c) => sum + Number(c.revenue_month || 0),
    0
  );

  const revenuePendingNote =
    totalRevenueMonth > 0 &&
    (revenueStats?.this_month === 0 || revenueStats?.this_month == null)
      ? 'ingresos pendientes de confirmación'
      : null;

  const revenueDisplay =
    revenuePendingNote ??
    `$${(revenueStats?.this_month || totalRevenueMonth).toLocaleString() || '0'}`;

  const monthlyRevenue = revenueStats?.by_month ?? [];
  const maxMonthAmount = Math.max(1, ...monthlyRevenue.map((m) => Number(m.amount || 0)));

  if (!user) return null;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-400">
          {error}
        </div>
      ) : null}

      {/* Row 1: Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Usuarios Registrados"
          value={totalUsers.toLocaleString()}
          icon={<Users size={20} />}
          badge={`${totalCoaches} coaches`}
        />
        <MetricCard
          title="Membresías Activas"
          value={activeMemberships.toLocaleString()}
          icon={<TrendingUp size={20} />}
          badge={`${dashboardStats?.memberships_count ?? 0} totales`}
        />
        <MetricCard
          title="Atletas Vinculados"
          value={linkedAthletes.toLocaleString()}
          icon={<Activity size={20} />}
          badge={`${expiringCoaches} por vencer`}
        />
      </div>

      {/* Row 2: Financial & Coach Quick Pulse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Ingresos mes (planes)
          </p>
          <p className="mt-1 text-lg sm:text-xl font-extrabold text-white tabular-nums truncate">
            {revenueDisplay}
          </p>
          <p className="mt-1 text-[10px] text-emerald-400 font-medium">Facturación plataforma</p>
        </div>

        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Total Coaches / Trainers
          </p>
          <p className="mt-1 text-lg sm:text-xl font-extrabold text-white tabular-nums">
            {totalCoaches}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">
            {activeCoaches} con plan activo
          </p>
        </div>

        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Ingresos Año / Total
          </p>
          <p className="mt-1 text-lg sm:text-xl font-extrabold text-white tabular-nums truncate">
            ${Number(revenueStats?.this_year ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">
            Total: ${Number(revenueStats?.total ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Suscripciones Omitidas
          </p>
          <p className="mt-1 text-lg sm:text-xl font-extrabold text-white tabular-nums">
            {dashboardStats?.skipped_subscriptions ?? 0}
          </p>
          <p className="mt-1 text-[10px] text-amber-400 font-medium">
            {expiringCoaches} planes por vencer
          </p>
        </div>
      </div>

      {/* Row 3: Monthly Revenue & Coaches Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Revenue Breakdown */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#26262B] pb-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Ingresos Mensuales
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Serie histórica reportada por el backend
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8E8E93]">
                Cargando ingresos...
              </div>
            ) : monthlyRevenue.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8E8E93]">
                Sin ingresos mensuales registrados.
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyRevenue.map((entry) => {
                  const amount = Number(entry.amount || 0);
                  const pct = Math.max(4, Math.round((amount / maxMonthAmount) * 100));
                  return (
                    <div key={entry.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#D1D1D6]">{entry.month}</span>
                        <span className="font-mono font-bold text-white">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#26262B]">
                        <div
                          className="h-full rounded-full bg-[#E07A3D] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coaches Table */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">Coaches</h3>
              <p className="text-xs text-[#8E8E93]">Listado y estado de entrenadores en la plataforma</p>
            </div>
            <div className="relative w-full sm:w-56">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar entrenador..."
                className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:border-[#E07A3D] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            {filteredCoaches.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8E8E93]">
                {loading
                  ? 'Cargando entrenadores...'
                  : 'No hay entrenadores registrados que coincidan con la búsqueda.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#26262B] text-[11px] uppercase tracking-wider text-[#71717A]">
                    <th className="py-2.5 px-3">Coach</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Atletas</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {filteredCoaches.slice(0, 8).map((c) => (
                    <tr key={c.id} className="hover:bg-[#1B1B22] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{c.name}</div>
                        <div className="text-[10px] text-[#71717A]">{c.email}</div>
                      </td>
                      <td className="py-3 px-3 text-[#D1D1D6]">
                        {c.plan_name || 'Sin plan'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
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
                      <td className="py-3 px-3 text-right font-mono text-white">
                        {c.athletes_count ?? 0}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCoach(c);
                            setDetailModalOpen(true);
                          }}
                          className="rounded-lg p-1 text-[#8E8E93] hover:text-[#E07A3D]"
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Coach Detail Modal */}
      {selectedCoach && (
        <Modal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Detalle del Coach: ${selectedCoach.name}`}
          description={selectedCoach.email}
        >
          <div className="grid grid-cols-2 gap-4 text-xs">
            <Field label="Plan">{selectedCoach.plan_name || 'Sin plan'}</Field>
            <Field label="Estado">{selectedCoach.plan_status || 'Inactivo'}</Field>
            <Field label="Atletas Activos">{selectedCoach.athletes_count ?? 0}</Field>
            <Field label="Ingresos Mes">
              ${Number(selectedCoach.revenue_month || 0).toLocaleString()}
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

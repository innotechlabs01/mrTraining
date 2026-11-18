'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  DollarSign,
  Users,
  AlertCircle,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Search as SearchIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Badge,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SearchField,
  secondaryButtonClass,
} from '@/components/admin/ui';

interface CoachSummary {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: string;
  plan_name: string;
  plan_price: number;
  plan_max_athletes: number;
  plan_status: string;
  plan_expires_at: string;
  athletes_count: number;
  revenue_month: number;
  revenue_total: number;
  last_login: string;
  skip_subscription: boolean;
}

interface DashboardStats {
  coaches_count: number;
  active_coaches_count: number;
  users_count: number;
  memberships_count: number;
  active_memberships_count: number;
  linked_athletes_count: number;
  expiring_coaches_count: number;
  skipped_subscriptions: number;
}

interface RevenueStats {
  today: number;
  this_month: number;
  this_year: number;
  total: number;
  by_month: { month: string; amount: number }[];
}

const CHART_AXIS = '#9CA3AF';
const CHART_GRID = '#2A2A2C';
const BRAND = '#15AAF2';
const SUCCESS = '#34D399';
const WARNING = '#FBBF24';
const ERROR = '#FF5A5F';
const NEUTRAL = '#6B7280';

function StatCard({
  title,
  value,
  icon,
  tone,
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{title}</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-text-primary">{value}</p>
          {trend ? (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-xs font-medium',
                trend.value >= 0 ? 'text-success' : 'text-error',
              )}
            >
              {trend.value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-text-secondary">{trend.label}</span>
            </div>
          ) : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

function planTone(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'expired') return 'error' as const;
  if (status === 'skipped') return 'warning' as const;
  return 'neutral' as const;
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

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';
  const isLoaded = !!user;

  async function getAuthHeader(): Promise<{ [key: string]: string }> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // fetch con reintento automático de refresh token cuando expiran los 401
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
      const [coachesRes, revenueRes, dashboardRes] = await Promise.all([
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/revenue`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/dashboard`),
      ]);

      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(Array.isArray(data) ? data : data.data || []);
      }
      if (revenueRes.ok) setRevenueStats(await revenueRes.json());
      if (dashboardRes.ok) setDashboardStats(await dashboardRes.json());
      if (!coachesRes.ok && !revenueRes.ok && !dashboardRes.ok) {
        throw new Error('La API rechazó las tres consultas del panel');
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
      (c) => c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term),
    );
  }, [coaches, search]);

  // `||` en lugar de `??`: si el backend devuelve 0 (consulta vacía o sin filas
  // que matcheen), caemos al fallback calculado sobre la lista de coaches.
  // Así el super admin ve siempre datos reales aunque una consulta agregada
  // devuelva cero por no coincidir con el filtro de rol de users.
  const totalCoaches = dashboardStats?.coaches_count || coaches.length;
  const activeCoaches =
    dashboardStats?.active_coaches_count ||
    coaches.filter((c) => c.plan_status === 'active').length;
  const expiringCoaches =
    dashboardStats?.expiring_coaches_count ||
    coaches.filter(
      (c) =>
        c.plan_status &&
        c.plan_expires_at &&
        new Date(c.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ).length;
  const skippedSubscriptions =
    dashboardStats?.skipped_subscriptions ||
    coaches.filter((c) => c.skip_subscription).length;
  // Ingresos del mes: se prefiere el agregado de /revenue, pero si devuelve 0
  // (p. ej. sin filas en wompi_payment_ledger) se cae al total calculado sobre
  // la lista de coaches, que ya trae revenue_month por coach. Así el super admin
  // ve siempre una cifra real en el CRM global.
  const totalRevenueMonth = coaches.reduce(
    (sum, c) => sum + Number(c.revenue_month || 0),
    0,
  );
  // Distribución por plan adquirido. Se calcula sobre los coaches que pasan
  // el filtro de búsqueda del dashboard para que el gráfico responda al filtro.
  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const coach of filteredCoaches) {
      const name =
        coach.plan_name?.trim() || (coach.skip_subscription ? 'Membresía omitida' : 'Sin plan');
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    const palette = [BRAND, SUCCESS, WARNING, ERROR, '#A78BFA', '#F472B6'];
    let colorIndex = 0;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, value]) => ({
        name,
        value,
        color:
          name === 'Sin plan' || name === 'Membresía omitida'
            ? NEUTRAL
            : palette[colorIndex++ % palette.length],
      }));
  }, [filteredCoaches]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Dashboard"
        description="Coaches, membresías, ingresos y actividad de la plataforma."
        actions={
          <button
            type="button"
            onClick={() => void loadData()}
            className={secondaryButtonClass}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-24 animate-pulse rounded-xl border border-surface-6 bg-surface-1" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
            <StatCard
              title="Total coaches"
              value={totalCoaches}
              icon={<Users size={20} />}
              tone="bg-brand-primary/10 text-brand-primary"
            />
            <StatCard
              title="Coaches activos"
              value={activeCoaches}
              icon={<Users size={20} />}
              tone="bg-success/10 text-success"
            />
            <StatCard
              title="Por vencer (7d)"
              value={expiringCoaches}
              icon={<AlertCircle size={20} />}
              tone="bg-warning/10 text-warning"
            />
            <StatCard
              title="Ingresos mes (planes)"
              value={`$${(revenueStats?.this_month || totalRevenueMonth).toLocaleString() || '0'}`}
              icon={<DollarSign size={20} />}
              tone="bg-brand-primary/10 text-brand-primary"
            />
            <StatCard
              title="Suscripciones omitidas"
              value={skippedSubscriptions}
              icon={<Minus size={20} />}
              tone="bg-warning/10 text-warning"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="border-b border-surface-6 p-4">
                <h2 className="text-base font-semibold text-text-primary">Ingresos por mes</h2>
              </div>
              <div className="h-64 p-2 sm:h-72 sm:p-4">
                {(revenueStats?.by_month?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<DollarSign size={18} />}
                    title="Aún no hay ingresos registrados"
                    description="El gráfico aparecerá cuando se registre el primer pago."
                  />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueStats?.by_month || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} width={48} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141416',
                        border: '1px solid #2A2A2C',
                        borderRadius: '8px',
                        color: '#F5F5F7',
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={BRAND}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <div className="border-b border-surface-6 p-4">
                <h2 className="text-base font-semibold text-text-primary">Distribución de planes</h2>
              </div>
              <div className="h-64 overflow-y-auto p-4 sm:h-72">
                {planDistribution.length === 0 ? (
                  <EmptyState
                    title="Sin datos de planes"
                    description="No hay coaches para el filtro actual."
                  />
                ) : (
                  <ul className="space-y-4">
                    {planDistribution.map((plan) => {
                      const percent = Math.round((plan.value / filteredCoaches.length) * 100);
                      return (
                        <li key={plan.name}>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-text-primary">{plan.name}</span>
                            <span className="shrink-0 tabular-nums text-text-secondary">
                              {plan.value} {plan.value === 1 ? 'coach' : 'coaches'} · {percent}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percent}%`, backgroundColor: plan.color }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardToolbar title="Coaches" meta={<Badge>{filteredCoaches.length}</Badge>}>
              <SearchField value={search} onChange={setSearch} placeholder="Buscar coach..." />
            </CardToolbar>

            {filteredCoaches.length === 0 ? (
              <EmptyState
                icon={<SearchIcon size={18} />}
                title={coaches.length === 0 ? 'Todavía no hay coaches' : 'Sin resultados'}
                description={
                  coaches.length === 0
                    ? 'Cuando un coach active su cuenta aparecerá en este listado.'
                    : 'Ajusta la búsqueda para encontrar al coach.'
                }
              />
            ) : (
              <>
                <div
                  role="region"
                  aria-label="Listado de coaches del CRM"
                  tabIndex={0}
                  className="hidden overflow-x-auto md:block"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-6 text-left text-text-secondary">
                        <th scope="col" className="p-3 font-medium">Coach</th>
                        <th scope="col" className="p-3 font-medium">Plan</th>
                        <th scope="col" className="p-3 font-medium">Estado</th>
                        <th scope="col" className="p-3 font-medium">Vence</th>
                        <th
                          scope="col"
                          className="p-3 text-right font-medium"
                          title="Costo del plan de plataforma que pagó el coach este mes"
                        >
                          Ingresos mes (plan)
                        </th>
                        <th scope="col" className="p-3 text-right font-medium">Atletas</th>
                        <th scope="col" className="p-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCoaches.map((coach) => (
                        <tr
                          key={coach.id}
                          className="border-b border-surface-6 transition-colors last:border-0 hover:bg-surface-2"
                        >
                          <th scope="row" className="p-3 text-left font-normal">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                                {coach.name?.charAt(0).toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-text-primary">{coach.name}</span>
                                <span className="block truncate text-xs text-text-secondary">{coach.email}</span>
                              </span>
                            </div>
                          </th>
                          <td className="p-3 text-text-primary">{coach.plan_name || '—'}</td>
                          <td className="p-3">
                            <Badge tone={planTone(coach.plan_status)}>
                              {coach.skip_subscription ? 'Omitida' : coach.plan_status || 'Sin plan'}
                            </Badge>
                          </td>
                          <td className="p-3 text-text-secondary">
                            {coach.plan_expires_at
                              ? new Date(coach.plan_expires_at).toLocaleDateString('es-CO')
                              : '—'}
                          </td>
                          <td className="p-3 text-right tabular-nums text-text-primary">
                            ${coach.revenue_month?.toLocaleString() || '0'}
                          </td>
                          <td className="p-3 text-right tabular-nums text-text-primary">
                            {coach.athletes_count}
                            {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setDetailModalOpen(true);
                              }}
                              className="rounded-lg border border-surface-6 bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-primary/20 hover:bg-brand-primary/10 hover:text-brand-primary"
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-surface-6 md:hidden">
                  {filteredCoaches.map((coach) => (
                    <li key={coach.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{coach.name}</p>
                          <p className="truncate text-xs text-text-secondary">{coach.email}</p>
                        </div>
                        <Badge tone={planTone(coach.plan_status)}>
                          {coach.skip_subscription ? 'Omitida' : coach.plan_status || 'Sin plan'}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-text-secondary">Plan</dt>
                          <dd className="truncate text-text-primary">{coach.plan_name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-secondary">Ingresos mes (plan)</dt>
                          <dd className="tabular-nums text-text-primary">
                            ${coach.revenue_month?.toLocaleString() || '0'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-secondary">Atletas</dt>
                          <dd className="tabular-nums text-text-primary">
                            {coach.athletes_count}
                            {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                          </dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoach(coach);
                          setDetailModalOpen(true);
                        }}
                        className="w-full rounded-lg border border-surface-6 bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-brand-primary/20 hover:bg-brand-primary/10 hover:text-brand-primary"
                      >
                        Ver detalle
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </>
      )}

      <Modal
        open={detailModalOpen && !!selectedCoach}
        onClose={() => setDetailModalOpen(false)}
        title="Detalle del coach"
        description={selectedCoach ? `${selectedCoach.name} · ${selectedCoach.email}` : undefined}
        footer={
          <button
            type="button"
            onClick={() => setDetailModalOpen(false)}
            className={secondaryButtonClass}
          >
            Cerrar
          </button>
        }
      >
        {selectedCoach ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre">{selectedCoach.name}</Field>
            <Field label="Email">{selectedCoach.email}</Field>
            <Field label="Plan">{selectedCoach.plan_name || '—'}</Field>
            <Field label="Precio del plan">
              {selectedCoach.plan_price ? `$${selectedCoach.plan_price.toLocaleString()} COP` : '—'}
            </Field>
            <Field label="Estado del plan">
              <Badge tone={planTone(selectedCoach.plan_status)}>
                {selectedCoach.plan_status === 'skipped' ? 'Omitido' : selectedCoach.plan_status || 'Sin plan'}
              </Badge>
            </Field>
            <Field label="Vence">
              {selectedCoach.plan_expires_at
                ? new Date(selectedCoach.plan_expires_at).toLocaleDateString('es-CO')
                : '—'}
            </Field>
            <Field label="Atletas">
              {selectedCoach.athletes_count}
              {selectedCoach.plan_max_athletes ? ` / ${selectedCoach.plan_max_athletes}` : ''}
            </Field>
            <Field label="Membresía">
              <Badge tone={selectedCoach.skip_subscription ? 'warning' : 'success'}>
                {selectedCoach.skip_subscription ? 'Omitida' : 'Activa'}
              </Badge>
            </Field>
            <Field label="Ingresos mes (plan)">${selectedCoach.revenue_month?.toLocaleString() || '0'}</Field>
            <Field label="Ingresos totales">${selectedCoach.revenue_total?.toLocaleString() || '0'}</Field>
            <Field label="Último login">
              {selectedCoach.last_login
                ? new Date(selectedCoach.last_login).toLocaleDateString('es-CO')
                : '—'}
            </Field>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}

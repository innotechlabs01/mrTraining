'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Users, AlertCircle, TrendingUp, Settings, ArrowUpRight, ArrowDownRight, Minus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CoachSummary {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: string;
  plan_name: string;
  plan_price: number;
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

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
}

function StatCard({ title, value, icon, color, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-surface-6 bg-surface-1 p-5 hover:border-brand-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.value >= 0 ? 'text-success' : 'text-error'
            )}>
              {trend.value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-text-secondary">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<CoachSummary | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';

  async function getAuthHeader(): Promise<{ [key: string]: string }> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // fetch con reintento automático de refresh token cuando expiran los 401
  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let res = await fetch(url, {
      ...options,
      headers: { ...(await getAuthHeader()), ...options.headers },
    });
    if (res.status === 401) {
      const newToken = await getToken();
      if (newToken) {
        res = await fetch(url, {
          ...options,
          headers: { Authorization: `Bearer ${newToken}`, ...options.headers },
        });
      }
    }
    return res;
  }

  useEffect(() => {
    if (isLoaded && user) {
      if (!isSuperAdmin) {
        router.replace('/');
        return;
      }
      loadData();
    }
  }, [user, isSuperAdmin, router]);

  const isLoaded = !!user;

  async function loadData() {
    setLoading(true);
    try {
      const [coachesRes, revenueRes, dashboardRes] = await Promise.all([
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/revenue`),
        fetchWithAuth(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/dashboard`),
      ]);

      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(Array.isArray(data) ? data : (data.data || []));
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueStats(data);
      }
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardStats(data);
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSkipSubscription(coachId: string) {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches/${coachId}/skip-subscription`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        setCoaches(prev =>
          prev.map(c => (c.id === coachId ? { ...c, skip_subscription: !c.skip_subscription } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Detail modal for coach
  const detailCoach = selectedCoach;
  if (detailModalOpen && detailCoach) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-surface-1 rounded-xl border border-surface-6 shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Detalle del Coach</h2>
            <button onClick={() => setDetailModalOpen(false)} className="rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Nombre</p>
                <p className="text-text-primary font-medium">{detailCoach.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Email</p>
                <p className="text-text-primary font-medium">{detailCoach.email}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Plan</p>
                <p className="text-text-primary font-medium">{detailCoach.plan_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Precio Plan</p>
                <p className="text-text-primary font-medium">${detailCoach.plan_price?.toLocaleString() || '0'} {detailCoach.plan_price ? 'COP' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Estado Plan</p>
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium inline-block',
                  detailCoach.plan_status === 'active' ? 'bg-success/10 text-success' :
                  detailCoach.plan_status === 'expired' ? 'bg-error/10 text-error' :
                  detailCoach.plan_status === 'skipped' ? 'bg-warning/10 text-warning' :
                  'bg-surface-2 text-text-secondary'
                )}>
                  {detailCoach.plan_status === 'skipped' ? 'Omitido' : detailCoach.plan_status}
                </span>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Vence</p>
                <p className="text-text-primary font-medium">{detailCoach.plan_expires_at ? new Date(detailCoach.plan_expires_at).toLocaleDateString('es-ES') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Atletas</p>
                <p className="text-text-primary font-medium">{detailCoach.athletes_count}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Membresía</p>
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium inline-block',
                  detailCoach.skip_subscription
                    ? 'bg-warning/10 text-warning border border-warning/20'
                    : 'bg-success/10 text-success border border-success/20'
                )}>
                  {detailCoach.skip_subscription ? 'Omitida' : 'Activa'}
                </span>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Ingresos Mes</p>
                <p className="text-text-primary font-medium">${detailCoach.revenue_month?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Ingresos Totales</p>
                <p className="text-text-primary font-medium">${detailCoach.revenue_total?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">Último Login</p>
                <p className="text-text-primary font-medium">{detailCoach.last_login ? new Date(detailCoach.last_login).toLocaleDateString('es-ES') : '—'}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-brand-primary text-text-inverse text-sm font-medium hover:bg-brand-primary/90 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!user) return null;
  if (!isSuperAdmin) return <div className="p-6">Acceso denegado</div>;

  const totalCoaches = dashboardStats?.coaches_count ?? coaches.length;
  const activeCoaches = coaches.filter(c => c.plan_status === 'active').length;
  const expiringCoaches = dashboardStats?.expiring_coaches_count ?? coaches.filter(c => c.plan_status && c.plan_expires_at && new Date(c.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
  const skippedSubscriptions = dashboardStats?.skipped_subscriptions ?? coaches.filter(c => c.skip_subscription).length;
  const active = coaches.filter(c => c.plan_status === 'active' || c.skip_subscription).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CRM Dashboard</h1>
          <p className="text-text-secondary mt-1">Gestión de coaches, membresías, tickets y planes</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Coaches"
          value={totalCoaches}
          icon={<Users size={24} />}
          color="bg-brand-primary/10 text-brand-primary"
        />
        <StatCard
          title="Coaches Activos"
          value={activeCoaches}
          icon={<Users size={24} />}
          color="bg-success/10 text-success"
        />
        <StatCard
          title="Por Vencer (7d)"
          value={expiringCoaches}
          icon={<AlertCircle size={24} />}
          color="bg-warning/10 text-warning"
        />
        <StatCard
          title="Ingresos Mes"
          value={`$${revenueStats?.this_month?.toLocaleString() || '0'}`}
          icon={<DollarSign size={24} />}
          color="bg-brand-primary/10 text-brand-primary"
        />
        <StatCard
          title="Suscripciones Omitidas"
          value={skippedSubscriptions}
          icon={<Minus size={24} />}
          color="bg-warning/10 text-warning"
        />
      </div>

      {/* Charts & Coaches Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-6 bg-surface-1 p-5">
            <h3 className="text-sm font-bold text-text-primary mb-4">Ingresos por Mes</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueStats?.by_month || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#15AAF2" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div>
          <div className="rounded-xl border border-surface-6 bg-surface-1 p-5 h-[360px]">
            <h3 className="text-sm font-bold text-text-primary mb-4">Distribución de Planes</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Activos', value: active, color: '#3BA55D' },
                      { name: 'Por Vencer', value: expiringCoaches, color: '#FBBF24' },
                      { name: 'Vencidos', value: coaches.filter(c => c.plan_status === 'expired').length, color: '#ED4245' },
                      { name: 'Sin Plan', value: coaches.filter(c => !c.plan_status || c.plan_status === 'none').length, color: '#94A3B8' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {[
                      { name: 'Activos', color: '#3BA55D' },
                      { name: 'Por Vencer', color: '#FBBF24' },
                      { name: 'Vencidos', color: '#ED4245' },
                      { name: 'Omitidos', color: '#FBBF24' },
                      { name: 'Sin Plan', color: '#94A3B8' },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Coaches Table */}
      <div className="rounded-xl border border-surface-6 bg-surface-1 overflow-hidden">
        <div className="p-4 border-b border-surface-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-primary">Coaches</h2>
            <span className="text-xs text-text-secondary px-2 py-1 rounded-full bg-surface-2">{totalCoaches} coaches</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Buscar coach..."
              className="w-64 pl-10 pr-4 py-2 rounded-xl bg-surface-1 border border-surface-6 text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary text-sm"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-6 text-text-secondary text-left">
                <th className="p-3">Coach</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Vence</th>
                <th className="p-3">Membresía</th>
                <th className="p-3 text-right">Ingresos Mes</th>
                <th className="p-3 text-right">Atletas</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c: CoachSummary) => (
                <tr key={c.id} className="border-b border-surface-1 hover:bg-surface-2 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xs font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{c.name}</div>
                        <div className="text-xs text-text-secondary">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{c.plan_name || '—'}</td>
                  <td className="p-3">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      c.plan_status === 'active' ? 'bg-success/10 text-success' :
                      c.plan_status === 'expired' ? 'bg-error/10 text-error' :
                      c.plan_status === 'skipped' ? 'bg-warning/10 text-warning' :
                      'bg-surface-2 text-text-secondary'
                    )}>
                      {c.plan_status === 'skipped' ? 'Omitido' : c.plan_status}
                    </span>
                  </td>
                  <td className="p-3">{c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString('es-ES') : '—'}</td>
                  <td className="p-3">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      c.skip_subscription ? 'bg-success/10 text-success border border-success/20' :
                      c.plan_status === 'active' ? 'bg-success/10 text-success border border-success/20' :
                      c.plan_status === 'expired' ? 'bg-error/10 text-error border border-error/20' :
                      c.plan_status === 'skipped' ? 'bg-warning/10 text-warning border border-warning/20' :
                      'bg-surface-2 text-text-secondary border border-surface-3'
                    )}>
                      {c.skip_subscription ? 'Activa (omitida)' : (c.plan_status === 'skipped' ? 'Omitido' : c.plan_status)}
                    </span>
                  </td>
                  <td className="p-3 text-right">${c.revenue_month?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{c.athletes_count}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedCoach(c); setDetailModalOpen(true); }}
                        className="px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-6 text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/20 text-xs font-medium transition-colors"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <div className="rounded-xl border border-surface-6 bg-surface-1 p-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">Ingresos por Mes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']}
            />
            <Line type="monotone" dataKey="amount" stroke="#15AAF2" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlanDistributionChart({ data }: { data: CoachSummary[] }) {
  const active = data.filter(c => c.plan_status === 'active' || c.skip_subscription).length;
  const expired = data.filter(c => c.plan_status === 'expired').length;
  const cancelled = data.filter(c => c.plan_status === 'cancelled').length;
  const none = data.filter(c => !c.plan_status || c.plan_status === 'none').length;

  return (
    <div className="rounded-xl border border-surface-6 bg-surface-1 p-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">Estado de Planes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Activos', value: active, color: '#3BA55D' },
                { name: 'Por Vencer', value: data.filter(c => c.plan_expires_at && new Date(c.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length, color: '#FBBF24' },
                { name: 'Vencidos', value: expired, color: '#ED4245' },
                { name: 'Sin Plan', value: none, color: '#94A3B8' },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              fill="#8884d8"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {[
                { name: 'Activos', color: '#3BA55D' },
                { name: 'Por Vencer', color: '#FBBF24' },
                { name: 'Vencidos', color: '#ED4245' },
                { name: 'Sin Plan', color: '#94A3B8' },
              ].map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { ArrowLeft, DollarSign, Users, AlertCircle, TrendingUp, Settings } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

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
}

interface RevenueStats {
  today: number;
  this_month: number;
  this_year: number;
  total: number;
  by_month: { month: string; amount: number }[];
}

export default function CRMDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const isSuperAdmin = user?.id && superAdminIds.includes(user.id);

  useEffect(() => {
    if (isLoaded && user) {
      if (!isSuperAdmin) {
        router.push('/coach');
        return;
      }
      loadData();
    }
  }, [user, isSuperAdmin, router]);

  const isLoaded = !!user;

  async function loadData() {
    try {
      const [coachesRes, revenueRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches`),
        fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/revenue`),
      ]);

      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(Array.isArray(data) ? data : (data.data || []));
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueStats(data);
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;
  if (!isSuperAdmin) return <div className="p-6">Acceso denegado</div>;

  const totalCoaches = coaches.length;
  const activeCoaches = coaches.filter(c => c.plan_status === 'active').length;
  const expiringCoaches = coaches.filter(c => c.plan_status && c.plan_expires_at && new Date(c.plan_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="p-6 bg-surface-0 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">CRM — Panel de Super Admin</h1>
          <p className="text-text-secondary">Gestión de coaches, ganancias y pagos</p>
        </div>
        <div className="flex justify-end">
          <Link href="/admin/plans" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90">
            <Settings size={16} /> Gestionar Planes
          </Link>
          <Link href="/coach" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-1 border border-surface-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors">
            <ArrowLeft size={16} /> Volver a Coach
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Coaches Totales</p>
              <p className="text-lg font-bold text-text-primary">{totalCoaches}</p>
            </div>
            <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Users size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Coaches Activos</p>
              <p className="text-lg font-bold text-text-primary">{activeCoaches}</p>
            </div>
            <div className="w-8 h-8 rounded bg-emerald-400/10 flex items-center justify-center text-emerald-400">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Por Vencer (7d)</p>
              <p className="text-lg font-bold text-text-primary">{expiringCoaches}</p>
            </div>
            <div className="w-8 h-8 rounded bg-amber-400/10 flex items-center justify-center text-amber-400">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Ingresos Mes</p>
              <p className="text-lg font-bold text-text-primary">${revenueStats?.this_month?.toLocaleString() || '0'}</p>
            </div>
            <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueStats?.by_month || []} />
        </div>
        <div>
          <PlanDistributionChart data={coaches} />
        </div>
      </div>

      <div className="rounded-xl border border-surface-2 bg-surface-1 overflow-hidden">
        <div className="p-4 border-b border-surface-2 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Coaches</h2>
          <span className="text-xs text-text-secondary">{totalCoaches} coaches</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-2 text-text-secondary text-left">
              <th className="p-3">Coach</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Vence</th>
              <th className="p-3 text-right">Ingresos Mes</th>
              <th className="p-3 text-right">Atletas</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((c: CoachSummary) => (
              <tr key={c.id} className="border-b border-surface-1 hover:bg-surface-2 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xs font-bold">
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
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    c.plan_status === 'active' ? 'bg-emerald-400/10 text-emerald-400' :
                    c.plan_status === 'expired' ? 'bg-rose-400/10 text-rose-400' :
                    'bg-surface-2 text-text-secondary'
                  }`}>
                    {c.plan_status}
                  </span>
                </td>
                <td className="p-3">{c.plan_expires_at || '—'}</td>
                <td className="p-3 text-right">${c.revenue_month?.toLocaleString() || '0'}</td>
                <td className="p-3 text-right">{c.athletes_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary">{title}</p>
          <p className="text-lg font-bold text-text-primary">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded bg-${color.split('-')[1] || 'brand'}-100 flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">Ingresos por Mes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#15AAF2" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlanDistributionChart({ data }: { data: CoachSummary[] }) {
  const active = data.filter(c => c.plan_status === 'active').length;
  const expired = data.filter(c => c.plan_status === 'expired').length;
  const cancelled = data.filter(c => c.plan_status === 'cancelled').length;
  const none = data.filter(c => !c.plan_status || c.plan_status === 'none').length;

  return (
    <div className="rounded-xl border border-surface-2 bg-surface-1 p-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">Estado de Planes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Activos', value: active, color: '#3BA55D' },
                { name: 'Vencidos', value: expired, color: '#ED4245' },
                { name: 'Cancelados', value: cancelled, color: '#FAA81A' },
                { name: 'Sin Plan', value: none, color: '#94A3B8' },
              ]}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              labelLine={false}
            >
              {[
                { name: 'Activos', color: '#3BA55D' },
                { name: 'Vencidos', color: '#ED4245' },
                { name: 'Cancelados', color: '#FAA81A' },
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

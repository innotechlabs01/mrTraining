'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useSession } from '@clerk/nextjs';
import { Users, Search, Shield, CreditCard } from 'lucide-react';

interface Coach {
  id: string;
  name: string;
  email: string;
  plan_name: string;
  plan_price: number;
  plan_status: string;
  plan_expires_at: string;
  athletes_count: number;
  skip_subscription: boolean;
  revenue_month: number;
}

export default function AdminCoachesPage() {
  const { user } = useUser();
  const { session } = useSession();
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '')
    .split(',')
    .filter(Boolean);
  const isSuperAdmin = !!user && superAdminIds.includes(user.id);

  useEffect(() => {
    if (!user) return;
    if (!isSuperAdmin) {
      router.push('/coach');
      return;
    }
    loadCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperAdmin]);

  async function loadCoaches() {
    try {
      const token = await session?.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCoaches(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSkipSubscription(coachId: string, currentValue: boolean) {
    setSaving(true);
    try {
      const token = await session?.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches/${coachId}/skip-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ skip_subscription: !currentValue }),
        }
      );
      if (res.ok) {
        setCoaches((prev) =>
          prev.map((c) => (c.id === coachId ? { ...c, skip_subscription: !c.skip_subscription } : c))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  if (!isSuperAdmin) {
    return <div className="p-6">Acceso denegado</div>;
  }

  const filtered = coaches.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.plan_status === 'active') ||
      (statusFilter === 'expired' && c.plan_status === 'expired') ||
      (statusFilter === 'skipped' && c.skip_subscription) ||
      (statusFilter === 'none' && !c.plan_name);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="p-6 text-text-secondary">Cargando coaches...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Coaches</h1>
          <p className="text-text-secondary">Administra coaches, planes y membresías</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar coach..."
              className="w-full lg:w-72 rounded-md border border-surface-6 bg-surface-0 pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="expired">Vencidos</option>
            <option value="skipped">Omitidos</option>
            <option value="none">Sin Plan</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-1 rounded-xl border border-surface-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-6 text-text-secondary text-left">
                <th className="p-4">Coach</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Vence</th>
                <th className="p-4 text-right">Atletas</th>
                <th className="p-4 text-right">Ingresos Mes</th>
                <th className="p-4 text-right">Membresía</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">
                    No se encontraron coaches.
                  </td>
                </tr>
              ) : (
                filtered.map((coach) => (
                  <tr
                    key={coach.id}
                    className="border-b border-surface-6 last:border-0 hover:bg-surface-2 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-sm font-bold shrink-0">
                          {coach.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary truncate">{coach.name}</div>
                          <div className="text-xs text-text-secondary truncate">{coach.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-text-primary">{coach.plan_name || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          coach.skip_subscription
                            ? 'bg-warning/15 text-warning'
                            : coach.plan_status === 'active'
                              ? 'bg-success/15 text-success'
                              : coach.plan_status === 'expired'
                                ? 'bg-error/15 text-error'
                                : 'bg-surface-3 text-text-secondary'
                        }`}
                      >
                        {coach.skip_subscription
                          ? 'Omitida'
                          : coach.plan_status || 'Sin plan'}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {coach.plan_expires_at ? coach.plan_expires_at.slice(0, 10) : '—'}
                    </td>
                    <td className="p-4 text-right text-text-primary">{coach.athletes_count}</td>
                    <td className="p-4 text-right text-text-primary">
                      {coach.revenue_month?.toLocaleString() || '0'}
                    </td>
                    <td className="p-4 text-right">
                      <label
                        className={`relative inline-flex items-center cursor-pointer transition-colors ${
                          saving ? 'opacity-50 cursor-wait' : ''
                        }`}
                        title={
                          coach.skip_subscription
                            ? 'El coach paga membresía (click para omitir)'
                            : 'El coach no paga membresía (click para cobrar)'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={coach.skip_subscription}
                          onChange={() => toggleSkipSubscription(coach.id, coach.skip_subscription)}
                          disabled={saving}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                          coach.skip_subscription ? 'bg-success' : 'bg-surface-3'
                        }`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                            coach.skip_subscription ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                        <span className={`ml-2 text-xs font-medium transition-colors ${
                          coach.skip_subscription ? 'text-success' : 'text-warning'
                        }`}>
                          {coach.skip_subscription ? 'Omitida' : 'Activa'}
                        </span>
                        {saving && <span className="ml-2 text-xs text-text-secondary">Guardando...</span>}
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
        <Users size={14} />
        {filtered.length} de {coaches.length} coaches
      </p>
    </div>
  );
}

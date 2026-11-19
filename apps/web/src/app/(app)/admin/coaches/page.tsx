'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Users, Search as SearchIcon } from 'lucide-react';

import {
  Badge,
  Card,
  CardToolbar,
  EmptyState,
  PageHeader,
  SearchField,
  inputClass,
} from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface Coach {
  id: string;
  coach_id: string;
  name: string;
  email: string;
  plan_name: string;
  plan_price: number;
  plan_max_athletes: number;
  plan_status: string;
  plan_expires_at: string;
  athletes_count: number;
  skip_subscription: boolean;
  revenue_month: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'skipped', label: 'Omitidos' },
  { value: 'none', label: 'Sin plan' },
];

function planBadge(coach: Coach) {
  if (coach.skip_subscription) return <Badge tone="warning">Omitida</Badge>;
  if (coach.plan_status === 'active') return <Badge tone="success">Activo</Badge>;
  if (coach.plan_status === 'expired') return <Badge tone="error">Vencido</Badge>;
  return <Badge>{coach.plan_status || 'Sin plan'}</Badge>;
}

export default function AdminCoachesPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '')
    .split(',')
    .filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  // Same rule as the layout and middleware: env allow-list OR Clerk metadata.
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';

  const loadCoaches = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status} al cargar coaches`);
      const data = await res.json();
      setCoaches(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los coaches');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    void loadCoaches();
  }, [user, isSuperAdmin, loadCoaches]);

  async function toggleSkipSubscription(coach: Coach, currentValue: boolean) {
    // Nunca enviar un Clerk ID (coach.id) en la URL: usar siempre el ID interno
    // de la tabla coaches (coach.coach_id). Si falta, bloquear la acción.
    if (!coach.coach_id) {
      setError('No se puede omitir la suscripción: el coach no tiene ID interno asignado.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/coaches/${coach.coach_id}/skip-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ skip_subscription: !currentValue }),
        },
      );
      if (!res.ok) throw new Error('No se pudo actualizar la membresía');
      setCoaches((prev) =>
        prev.map((c) => (c.id === coach.id ? { ...c, skip_subscription: !c.skip_subscription } : c)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la membresía');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(
    () =>
      coaches.filter((c) => {
        const term = search.toLowerCase();
        const matchesSearch =
          !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && c.plan_status === 'active') ||
          (statusFilter === 'expired' && c.plan_status === 'expired') ||
          (statusFilter === 'skipped' && c.skip_subscription) ||
          (statusFilter === 'none' && !c.plan_name);
        return matchesSearch && matchesStatus;
      }),
    [coaches, search, statusFilter],
  );

  function MembershipToggle({ coach }: { coach: Coach }) {
    const disabled = saving || !coach.coach_id;
    return (
      <label
        className={cn(
          'inline-flex cursor-pointer items-center gap-2',
          disabled && 'cursor-not-allowed opacity-50',
          saving && 'cursor-wait opacity-50',
        )}
        title={
          !coach.coach_id
            ? 'El coach no tiene ID interno asignado: no se puede omitir la suscripción.'
            : coach.skip_subscription
              ? 'El coach paga membresía (click para omitir)'
              : 'El coach no paga membresía (click para cobrar)'
        }
      >
        <input
          type="checkbox"
          checked={coach.skip_subscription}
          onChange={() => void toggleSkipSubscription(coach, coach.skip_subscription)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 rounded-full bg-surface-3 transition-colors peer-checked:bg-success peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-0">
          <span
            className={cn(
              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              coach.skip_subscription && 'translate-x-5',
            )}
          />
        </span>
        <span
          className={cn(
            'text-xs font-medium',
                          coach.skip_subscription ? 'text-warning' : 'text-success',
          )}
        >
          {coach.skip_subscription ? 'Omitida' : 'Activa'}
        </span>
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de coaches"
        description="Administra coaches, planes y membresías de la plataforma."
      />

      {error ? (
        <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      <Card>
        <CardToolbar
          title="Coaches"
          meta={
            <span className="text-xs text-text-secondary">
              {filtered.length} de {coaches.length}
            </span>
          }
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar coach..."
            label="Buscar coach por nombre o email"
          />
          <label className="sr-only" htmlFor="coach-status-filter">
            Filtrar por estado
          </label>
          <select
            id="coach-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(inputClass, 'sm:w-44')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </CardToolbar>

        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={18} />}
            title="No se encontraron coaches"
            description="Ajusta la búsqueda o el filtro de estado para ver otros resultados."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div
              role="region"
              aria-label="Listado de coaches"
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
                    <th scope="col" className="p-3 text-right font-medium">Atletas</th>
                    <th
                      scope="col"
                      className="p-3 text-right font-medium"
                      title="Costo del plan de plataforma que pagó el coach este mes"
                    >
                      Ingresos mes (plan)
                    </th>
                    <th scope="col" className="p-3 text-right font-medium">Membresía</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((coach) => (
                    <tr
                      key={coach.id}
                      className="border-b border-surface-6 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <th scope="row" className="p-3 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                            {coach.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-text-primary">{coach.name}</span>
                            <span className="block truncate text-xs text-text-secondary">{coach.email}</span>
                          </span>
                        </div>
                      </th>
                      <td className="p-3 text-text-primary">{coach.plan_name || '—'}</td>
                      <td className="p-3">{planBadge(coach)}</td>
                      <td className="p-3 text-text-secondary">
                        {coach.plan_expires_at ? coach.plan_expires_at.slice(0, 10) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums text-text-primary">
                        {coach.athletes_count}
                        {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                      </td>
                      <td className="p-3 text-right tabular-nums text-text-primary">
                        {coach.revenue_month?.toLocaleString() || '0'}
                      </td>
                      <td className="p-3 text-right">
                        <MembershipToggle coach={coach} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-surface-6 md:hidden">
              {filtered.map((coach) => (
                <li key={coach.id} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                      {coach.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary">{coach.name}</p>
                      <p className="truncate text-xs text-text-secondary">{coach.email}</p>
                    </div>
                    {planBadge(coach)}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-text-secondary">Plan</dt>
                      <dd className="truncate text-text-primary">{coach.plan_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Atletas</dt>
                      <dd className="tabular-nums text-text-primary">
                        {coach.athletes_count}
                        {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Ingresos mes (plan)</dt>
                      <dd className="tabular-nums text-text-primary">
                        ${coach.revenue_month?.toLocaleString() || '0'}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary">
                      Vence {coach.plan_expires_at ? coach.plan_expires_at.slice(0, 10) : '—'}
                    </span>
                    <MembershipToggle coach={coach} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <Users size={14} aria-hidden="true" />
        {filtered.length} de {coaches.length} coaches
      </p>
    </div>
  );
}

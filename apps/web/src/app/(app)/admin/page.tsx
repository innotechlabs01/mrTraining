import { ShieldCheck } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SecondaryLinkClass,
} from '@/components/admin/ui'

const GO = process.env.NEXT_PUBLIC_GO_API_URL || ''

type Dashboard = {
  coaches_count?: number
  active_coaches_count?: number
  users_count?: number
  memberships_count?: number
  active_memberships_count?: number
  linked_athletes_count?: number
}

type Coach = {
  id: string
  name: string
  email: string
  plan_name?: string
  plan_price?: number
  plan_max_athletes?: number
  plan_status?: string
  plan_expires_at?: string
  athletes_count?: number
  revenue_month?: number
  skip_subscription?: boolean
}

type CoachesResponse = Coach[] | { data?: Coach[] }

function planTone(coach: Coach): 'success' | 'error' | 'warning' | 'neutral' {
  if (coach.skip_subscription) return 'warning'
  if (coach.plan_status === 'active') return 'success'
  if (coach.plan_status === 'expired') return 'error'
  return 'neutral'
}

function planLabel(coach: Coach): string {
  if (coach.skip_subscription) return 'Omitida'
  if (coach.plan_status === 'active') return 'Activo'
  if (coach.plan_status === 'expired') return 'Vencido'
  return coach.plan_status || 'Sin plan'
}

type ServiceHealth = {
  status: string
  services?: Record<string, string>
}

async function goGet<T>(path: string, token: string): Promise<T | null> {
  if (!GO) return null
  try {
    const res = await fetch(`${GO}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export default async function AdminPage() {
  const authResult = await auth()
  const token = (await authResult.getToken()) || null

  const [dashboard, coachesResponse, health] = await Promise.all([
    token ? goGet<Dashboard>('/api/v1/admin/dashboard', token) : Promise.resolve(null),
    token ? goGet<CoachesResponse>('/api/v1/admin/coaches', token) : Promise.resolve(null),
    token ? goGet<ServiceHealth>('/api/v1/admin/services/health', token) : Promise.resolve(null),
  ])

  const coaches = Array.isArray(coachesResponse)
    ? coachesResponse
    : coachesResponse?.data ?? []
  const metrics: { label: string; value: number }[] = [
    { label: 'Coaches', value: dashboard?.coaches_count ?? 0 },
    { label: 'Coaches activos', value: dashboard?.active_coaches_count ?? 0 },
    { label: 'Usuarios', value: dashboard?.users_count ?? 0 },
    { label: 'Membresías', value: dashboard?.memberships_count ?? 0 },
    { label: 'Membresías activas', value: dashboard?.active_memberships_count ?? 0 },
    { label: 'Atletas vinculados', value: dashboard?.linked_athletes_count ?? 0 },
  ]
  const healthy = (health?.status ?? 'unknown') === 'healthy'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vista de plataforma"
        description="CRM general: todos los coaches, sus planes, atletas e ingresos de la plataforma."
        actions={
          <a href="/admin/dashboard" className={SecondaryLinkClass}>
            Ir al CRM
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">
              {metric.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-surface-6 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <ShieldCheck size={18} className="text-text-secondary" aria-hidden="true" />
            Salud de los servicios
          </h2>
          <Badge tone={healthy ? 'success' : 'error'}>
            {healthy ? 'Operativo' : health?.status ?? 'Desconocido'}
          </Badge>
        </div>
        <dl className="divide-y divide-surface-6">
          {health?.services && Object.keys(health.services).length > 0 ? (
            Object.entries(health.services).map(([name, value]) => (
              <div key={name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <dt className="text-sm capitalize text-text-secondary">{name}</dt>
                <dd>
                  <Badge tone={value.includes('healthy') ? 'success' : 'error'}>{value}</Badge>
                </dd>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-text-secondary">
              Sin datos de salud disponibles.
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2 border-b border-surface-6 p-4">
          <h2 className="text-base font-semibold text-text-primary">Coaches</h2>
          <Badge>{coaches.length}</Badge>
        </div>

        {coaches.length === 0 ? (
          <EmptyState
            title="Sin coaches todavía"
            description="Cuando un coach active su cuenta aparecerá en esta lista."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-6 text-left text-text-secondary">
                    <th className="p-3 font-medium">Coach</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 text-right font-medium">Atletas</th>
                    <th className="p-3 text-center font-medium">Vence</th>
                    <th className="p-3 text-center font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach) => (
                    <tr
                      key={coach.id}
                      className="border-b border-surface-6 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <td className="p-3 font-medium text-text-primary">
                        <span className="block">{coach.name}</span>
                        <span className="block text-xs font-normal text-text-secondary">
                          {coach.email}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary">{coach.plan_name || 'Sin plan'}</td>
                      <td className="p-3 text-right tabular-nums text-text-primary">
                        {coach.athletes_count ?? 0}
                        {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                      </td>
                      <td className="p-3 text-center text-text-secondary">
                        {coach.plan_expires_at
                          ? new Date(coach.plan_expires_at).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge tone={planTone(coach)}>{planLabel(coach)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-surface-6 md:hidden">
              {coaches.map((coach) => (
                <li key={coach.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{coach.name}</p>
                      <p className="truncate text-xs text-text-secondary">{coach.email}</p>
                    </div>
                    <Badge tone={planTone(coach)}>{planLabel(coach)}</Badge>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-text-secondary">Plan</dt>
                      <dd className="truncate text-text-primary">{coach.plan_name || 'Sin plan'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Atletas</dt>
                      <dd className="tabular-nums text-text-primary">
                        {coach.athletes_count ?? 0}
                        {coach.plan_max_athletes ? ` / ${coach.plan_max_athletes}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Vence</dt>
                      <dd className="text-text-primary">
                        {coach.plan_expires_at
                          ? new Date(coach.plan_expires_at).toLocaleDateString('es-CO')
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}

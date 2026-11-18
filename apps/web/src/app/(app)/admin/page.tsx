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
  is_active: boolean
  athletes_count: number
  memberships_count: number
  active_memberships_count: number
  created_at?: string
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
    token ? goGet<{ data?: Coach[]; total?: number }>('/api/v1/admin/coaches', token) : Promise.resolve(null),
    token ? goGet<ServiceHealth>('/api/v1/admin/services/health', token) : Promise.resolve(null),
  ])

  const coaches = coachesResponse?.data ?? []
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
        description="Resumen agregado de la plataforma. No expone datos privados de coaches ni atletas."
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
                    <th className="p-3 font-medium">Nombre</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 text-center font-medium">Activo</th>
                    <th className="p-3 text-right font-medium">Atletas</th>
                    <th className="p-3 text-right font-medium">Membresías</th>
                    <th className="p-3 text-right font-medium">Activas</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach) => (
                    <tr
                      key={coach.id}
                      className="border-b border-surface-6 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <td className="p-3 font-medium text-text-primary">{coach.name}</td>
                      <td className="p-3 text-text-secondary">{coach.email}</td>
                      <td className="p-3 text-center">
                        <Badge tone={coach.is_active ? 'success' : 'neutral'}>
                          {coach.is_active ? 'Sí' : 'No'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-text-primary">{coach.athletes_count}</td>
                      <td className="p-3 text-right tabular-nums text-text-primary">{coach.memberships_count}</td>
                      <td className="p-3 text-right tabular-nums text-text-primary">
                        {coach.active_memberships_count}
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
                    <Badge tone={coach.is_active ? 'success' : 'neutral'}>
                      {coach.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-text-secondary">Atletas</dt>
                      <dd className="tabular-nums text-text-primary">{coach.athletes_count}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Membresías</dt>
                      <dd className="tabular-nums text-text-primary">{coach.memberships_count}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Activas</dt>
                      <dd className="tabular-nums text-text-primary">{coach.active_memberships_count}</dd>
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

import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

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

function cookieHeader() {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Platform Admin (read-only)</h1>
          <p className="text-sm text-slate-400">
            Aggregated platform summary. No tenant or athlete private data is exposed.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['Coaches', dashboard?.coaches_count ?? 0],
            ['Active coaches', dashboard?.active_coaches_count ?? 0],
            ['Users', dashboard?.users_count ?? 0],
            ['Memberships', dashboard?.memberships_count ?? 0],
            ['Active memberships', dashboard?.active_memberships_count ?? 0],
            ['Linked athletes', dashboard?.linked_athletes_count ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-400">{label}</div>
              <div className="text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-medium mb-3">Service health</h2>
          <div className="text-sm">
            <div>Status: {health?.status ?? 'unknown'}</div>
            {health?.services &&
              Object.entries(health.services).map(([name, value]) => (
                <div key={name}>
                  {name}: {value}
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-medium mb-3">Coaches ({coaches.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Active</th>
                  <th className="text-right p-2">Athletes</th>
                  <th className="text-right p-2">Memberships</th>
                  <th className="text-right p-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr key={coach.id} className="border-t border-slate-800">
                    <td className="p-2">{coach.name}</td>
                    <td className="p-2">{coach.email}</td>
                    <td className="p-2">{coach.is_active ? 'yes' : 'no'}</td>
                    <td className="p-2 text-right">{coach.athletes_count}</td>
                    <td className="p-2 text-right">{coach.memberships_count}</td>
                    <td className="p-2 text-right">{coach.active_memberships_count}</td>
                  </tr>
                ))}
                {coaches.length === 0 && (
                  <tr>
                    <td className="p-2 text-slate-400" colSpan={6}>
                      No coaches available or no access.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

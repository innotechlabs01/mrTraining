'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const ATHLETE_USERS = [
  { id: 'athlete-1', name: 'Luca Martínez', email: 'luca@mr-training.com', initials: 'LM', sport: 'Fútbol', plan: 'Performance', level: 'Avanzado', coach: 'Alex Rivera' },
  { id: 'athlete-2', name: 'Sofía Torres', email: 'sofia@mr-training.com', initials: 'ST', sport: 'Baloncesto', plan: 'Strength', level: 'Intermedio', coach: 'María González' },
  { id: 'athlete-3', name: 'Ethan Brooks', email: 'ethan@mr-training.com', initials: 'EB', sport: 'Natación', plan: 'General', level: 'Principiante', coach: 'James Chen' },
]

export default function AthleticLoginPage() {
  const router = useRouter()

  const handleLogin = (user: (typeof ATHLETE_USERS)[number]) => {
    localStorage.setItem('mr-training-mock-user', JSON.stringify({ ...user, role: 'Athlete' }))
    router.push('/athlete/plan')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-display font-bold text-sm">
              MR
            </div>
            <span className="font-display text-lg font-semibold text-text-primary tracking-wide">
              Athlete Hub
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-text-primary">Athlete Access</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to track your training and programs</p>
        </div>

        <div className="space-y-3">
          {ATHLETE_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleLogin(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-3 bg-surface-1 hover:bg-surface-2 hover:border-brand-primary/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                  {u.name}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary">{u.sport}</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">{u.plan}</span>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary">{u.level}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">Coach: {u.coach}</p>
              </div>
              <div className="text-text-muted group-hover:text-brand-primary/50 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/coach/login" className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
            I&apos;m a Coach — Sign in here
          </a>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Modo desarrollo — autenticación simulada
        </p>
      </div>
    </div>
  )
}

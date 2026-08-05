'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const COACH_USERS = [
  { id: 'coach-1', name: 'Alex Rivera', email: 'alex@mr-training.com', role: 'Head Coach', initials: 'AR', coachPlan: 'performance', coachLevel: 'expert', specialization: 'Sports Performance', athletesCount: 12 },
  { id: 'coach-2', name: 'María González', email: 'maria@mr-training.com', role: 'Strength Coach', initials: 'MG', coachPlan: 'strength', coachLevel: 'advanced', specialization: 'Strength & Conditioning', athletesCount: 8 },
  { id: 'coach-3', name: 'James Chen', email: 'james@mr-training.com', role: 'Performance Coach', initials: 'JC', coachPlan: 'general', coachLevel: 'intermediate', specialization: 'General Fitness', athletesCount: 5 },
]

export default function CoachLoginPage() {
  const router = useRouter()

  const handleLogin = (user: (typeof COACH_USERS)[number]) => {
    localStorage.setItem('mr-training-mock-user', JSON.stringify(user))
    router.push('/coach/plan')
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
              Coach OS
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-text-primary">Coach Access</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to manage your athletes and programs</p>
        </div>

        <div className="space-y-3">
          {COACH_USERS.map((u) => (
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
                <p className="text-xs text-text-secondary">{u.role}</p>
              </div>
              <div className="text-text-muted group-hover:text-brand-primary/50 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href="/athletic/login" className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
            I&apos;m an Athlete — Sign in here
          </a>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Modo desarrollo — autenticación simulada
        </p>
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'

const USERS = [
  { id: 'coach-1', name: 'Alex Rivera', email: 'alex@mr-training.com', role: 'Head Coach', initials: 'AR' },
  { id: 'coach-2', name: 'María González', email: 'maria@mr-training.com', role: 'Strength Coach', initials: 'MG' },
  { id: 'coach-3', name: 'James Chen', email: 'james@mr-training.com', role: 'Performance Coach', initials: 'JC' },
]

export default function CoachLoginPage() {
  const router = useRouter()

  const handleLogin = (user: (typeof USERS)[number]) => {
    localStorage.setItem('mr-training-mock-user', JSON.stringify(user))
    router.push('/coach')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-display font-bold text-sm">
              MR
            </div>
            <span className="font-display text-lg font-semibold text-white/90 tracking-wide">
              Coach OS
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-white">Accede a tu cuenta</h1>
          <p className="text-sm text-white/40 mt-1">Selecciona un perfil para entrar al panel</p>
        </div>

        <div className="space-y-3">
          {USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => handleLogin(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-surface-1 hover:bg-surface-2 hover:border-brand-primary/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-brand-primary transition-colors">
                  {u.name}
                </p>
                <p className="text-xs text-white/40">{u.role}</p>
              </div>
              <div className="text-white/20 group-hover:text-brand-primary/50 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Modo desarrollo — autenticación simulada
        </p>
      </div>
    </div>
  )
}

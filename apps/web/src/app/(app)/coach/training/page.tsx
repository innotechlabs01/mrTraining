'use client'

import Link from 'next/link'
import { ListChecks, FileText, UserPlus } from 'lucide-react'

const CARDS = [
  {
    icon: ListChecks,
    label: 'Workouts',
    desc: 'Biblioteca de ejercicios, builder, templates y schedule',
    href: '/coach/workouts/exercises',
    color: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    icon: FileText,
    label: 'Programas',
    desc: 'Planes de entrenamiento semanales y mensuales',
    href: '/coach/training/programs',
    color: 'bg-purple-500/10 text-purple-400',
  },
  {
    icon: UserPlus,
    label: 'Asignar',
    desc: 'Asigna workouts o programas a atletas específicos',
    href: '/coach/training/asignar',
    color: 'bg-blue-500/10 text-blue-400',
  },
]

export default function CoachTrainingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Training</h1>
        <p className="text-sm text-white/40 mt-1">Gestiona workouts, programas y asignaciones</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-white/5 bg-surface-1 p-6 hover:border-white/10 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-4`}>
              <card.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{card.label}</h3>
            <p className="text-xs text-white/40">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

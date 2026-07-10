'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = ['Perfil', 'Notificaciones', 'Facturación', 'Preferencias']

export default function CoachSettingsPage() {
  const [tab, setTab] = useState(SETTINGS_TABS[0])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Configura tu perfil y preferencias</p>
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all relative',
              tab === t ? 'text-white' : 'text-white/40 hover:text-white/60',
            )}
          >
            {t}
            {tab === t && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-5">
        {tab === 'Perfil' && (
          <>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Nombre</label>
              <input
                type="text"
                defaultValue="Coach"
                className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-sm text-white focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Email</label>
              <input
                type="email"
                defaultValue="coach@mrtraining.app"
                className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-sm text-white focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Especialidad</label>
              <input
                type="text"
                defaultValue="Track & Field, Running"
                className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-sm text-white focus:outline-none focus:border-brand-primary/50"
              />
            </div>
          </>
        )}

        {tab === 'Notificaciones' && (
          <div className="space-y-4">
            {[
              { label: 'Nuevos mensajes de atletas', enabled: true },
              { label: 'Alertas de readiness bajos', enabled: true },
              { label: 'Pagos recibidos', enabled: true },
              { label: 'Recordatorio de sesiones', enabled: true },
              { label: 'Reporte semanal', enabled: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{n.label}</span>
                <div className={cn(
                  'w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer',
                  n.enabled ? 'bg-brand-primary' : 'bg-white/10',
                )}>
                  <div className={cn(
                    'w-4 h-4 rounded-full bg-white transition-transform',
                    n.enabled ? 'translate-x-4' : 'translate-x-0',
                  )} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Facturación' && (
          <div className="text-sm text-white/40">
            <p>Método de pago: **** 4242 (Visa)</p>
            <p className="mt-2">Próximo pago: 1 de Agosto, 2026</p>
          </div>
        )}

        {tab === 'Preferencias' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Idioma</span>
              <select className="px-3 py-1.5 rounded-lg bg-surface-0 border border-white/5 text-xs text-white">
                <option>Español</option>
                <option>English</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Zona horaria</span>
              <select className="px-3 py-1.5 rounded-lg bg-surface-0 border border-white/5 text-xs text-white">
                <option>America/Mexico_City (GMT-6)</option>
                <option>America/New_York (GMT-5)</option>
                <option>America/Los_Angeles (GMT-8)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { X, Mail, Phone, CalendarDays, Smartphone, Bluetooth, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCoachPanel } from './CoachPanelContext'
import { TimeBlockPanel } from '@/features/coach/components/timeline/TimeBlockPanel'
import { MOCK_ATHLETE_DETAILS } from '@/features/coach/data/_mocks'
import type { AthleteDetailData } from '@/features/coach/data/_mocks'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4 space-y-3">
      <h4 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-[#6B7280] shrink-0" />
      <span className="text-xs text-[#6B7280] w-16 shrink-0">{label}</span>
      <span className="text-sm text-white truncate">{value}</span>
    </div>
  )
}

function PanelContent() {
  const { panel } = useCoachPanel()

  if (!panel.type) return null

  switch (panel.type) {
    case 'athlete': {
      const data = panel.data as Record<string, unknown>
      const id = data.id as string | undefined
      const base = (id ? MOCK_ATHLETE_DETAILS[id] : undefined) as AthleteDetailData | undefined
      const d = { ...base, ...data } as AthleteDetailData
      const weightHistory = d.weightHistory ?? []
      const latest = weightHistory[weightHistory.length - 1]
      const prev = weightHistory[weightHistory.length - 2]
      const weightTrend = latest && prev ? latest.weight - prev.weight : 0
      const mmTrend = latest && prev ? latest.muscleMass - prev.muscleMass : 0

      if (data.action === 'add') {
        return (
          <div className="space-y-4 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Añadir atleta</h3>
                <p className="text-xs text-[#9CA3AF]">Registro de un nuevo atleta</p>
              </div>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              El formulario de registro de atletas estará disponible próximamente.
            </p>
          </div>
        )
      }

      const serviceColor: Record<string, string> = {
        Presencial: 'bg-blue-500/15 text-blue-400',
        Híbrido: 'bg-purple-500/15 text-purple-400',
        Running: 'bg-green-500/15 text-green-400',
        Virtual: 'bg-amber-500/15 text-amber-400',
      }

      return (
        <div className="space-y-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-lg font-bold shrink-0">
              {d.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{d.name}</h3>
              <p className="text-sm text-[#9CA3AF]">{d.sport}</p>
            </div>
            <span className={`ml-auto shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold ${serviceColor[d.serviceType] ?? 'bg-white/5 text-white/40'}`}>
              {d.serviceType}
            </span>
          </div>

          {d.flag && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400/90">{d.flag.message}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sueño', value: `${d.readiness?.sleep ?? '-'}${d.readiness?.sleep != null ? 'h' : ''}`, sub: (d.readiness?.score ?? 0) >= 70 ? 'Bueno' : 'Bajo', color: (d.readiness?.sleep ?? 0) >= 7 ? 'text-green-400' : 'text-red-400' },
              { label: 'HRV', value: d.readiness?.hrv != null ? String(d.readiness.hrv) : '-', sub: (d.readiness?.hrv ?? 0) >= 60 ? 'Normal' : 'Alerta', color: (d.readiness?.hrv ?? 0) >= 60 ? 'text-green-400' : 'text-red-400' },
              { label: 'Recuperación', value: d.readiness?.recovery != null ? `${d.readiness.recovery}%` : '-', sub: (d.readiness?.recovery ?? 0) >= 70 ? 'Óptima' : 'Crítica', color: (d.readiness?.recovery ?? 0) >= 70 ? 'text-green-400' : 'text-red-400' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-lg font-bold font-display ${item.color}`}>{item.value}</div>
                <div className={`text-[10px] mt-0.5 ${item.color}`}>{item.sub}</div>
              </div>
            ))}
          </div>

          <Section title="Información Personal">
            <InfoRow icon={Mail} label="Email" value={d.email ?? '-'} />
            <InfoRow icon={Phone} label="Teléfono" value={d.phone ?? '-'} />
            <InfoRow icon={CalendarDays} label="Desde" value={d.startDate ?? '-'} />
            <div className="pt-1 text-[10px] text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} />
              Contacto de emergencia: {d.emergencyContact ?? '-'}
            </div>
          </Section>

          {d.plan && d.schedule && (
            <Section title="Plan Contratado">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{d.plan.name}</p>
                  <p className="text-xs text-[#9CA3AF]">Facturación {d.plan.billingPeriod}</p>
                </div>
                <span className="text-lg font-bold font-display text-brand-primary">${d.plan.price}</span>
              </div>
            </Section>
          )}

          {d.plan && d.schedule && (
            <Section title="Horario de Entrenamiento">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-white">
                  <CalendarDays size={14} className="text-brand-primary" />
                  {d.schedule.days}
                </div>
                <span className="text-xs text-[#6B7280]">·</span>
                <span className="text-sm text-[#9CA3AF]">{d.schedule.time}</span>
              </div>
            </Section>
          )}

          <Section title="Evolución de Peso y Composición">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6B7280] uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 pr-2 font-medium">Mes</th>
                    <th className="text-right px-2 py-2 font-medium">Peso</th>
                    <th className="text-right px-2 py-2 font-medium">M. Muscular</th>
                    <th className="text-right pl-2 py-2 font-medium">% Grasa</th>
                  </tr>
                </thead>
                <tbody>
                  {weightHistory.map((row, i) => (
                    <tr key={row.date} className="border-b border-white/[0.02]">
                      <td className="py-2 pr-2 text-white/70">{row.date}</td>
                      <td className="text-right px-2 py-2 text-white font-medium">{row.weight} kg</td>
                      <td className="text-right px-2 py-2 text-white">{row.muscleMass} kg</td>
                      <td className="text-right pl-2 py-2 text-white/70">{row.bodyFat}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 pt-1 text-[11px]">
              <span className={`flex items-center gap-1 ${weightTrend <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {weightTrend <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                Peso {Math.abs(weightTrend).toFixed(1)} kg
              </span>
              <span className={`flex items-center gap-1 ${mmTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {mmTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                Masa muscular {Math.abs(mmTrend).toFixed(1)} kg
              </span>
            </div>
          </Section>

          {d.runningDevice && (
            <Section title="Dispositivo Running">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Smartphone size={16} className="text-brand-primary" />
                  <div>
                    <p className="text-sm font-medium text-white">{d.runningDevice.brand} {d.runningDevice.model}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${d.runningDevice.synced ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-xs ${d.runningDevice.synced ? 'text-green-400' : 'text-red-400'}`}>
                        {d.runningDevice.synced ? 'Sincronizado' : 'No sincronizado'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <Bluetooth size={10} />
                  Última sincronización: {d.runningDevice.lastSync}
                </div>
              </div>
            </Section>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors"
            >
              Enviar Mensaje
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded-lg bg-surface-3 text-white text-xs font-semibold hover:bg-surface-5 border border-surface-5 transition-colors"
            >
              Nota Rápida
            </button>
          </div>
        </div>
      )
    }

    case 'message': {
      const { senderName, content } = panel.data as {
        senderName?: string
        content?: string
      }
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Message</h3>
          <div className="glass-card rounded-lg p-4">
            {senderName ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{senderName}</p>
                <p className="text-sm text-[#9CA3AF]">{content ?? 'No content'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-[#6B7280]">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    case 'session': {
      const { name, time, location, status } = panel.data as {
        name?: string
        time?: string
        location?: string
        status?: string
      }
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{name ?? 'Session'}</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{time ?? '—'}</p>
            </div>
            {status && (
              <span className="px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-semibold uppercase">
                {status}
              </span>
            )}
          </div>

          {location && (
            <div className="glass-card rounded-lg p-3">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm text-white">{location}</p>
            </div>
          )}
        </div>
      )
    }

    case 'timeblock': {
      const { blockId } = panel.data as { blockId?: string }
      if (!blockId) return null
      return <TimeBlockPanel blockId={blockId} />
    }

    default:
      return null
  }
}

export function RightPanel() {
  const { panel, closePanel } = useCoachPanel()
  const isWide = panel.type === 'timeblock'

  return (
    <AnimatePresence>
      {panel.type && (
        <motion.aside
          initial={{ x: isWide ? 700 : 400 }}
          animate={{ x: 0 }}
          exit={{ x: isWide ? 700 : 400 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed right-0 top-14 bottom-0 w-full overflow-y-auto border-l border-surface-4 bg-surface-1 z-40 shadow-2xl',
            isWide ? 'max-w-2xl' : 'max-w-[400px]',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Detail panel"
        >
          <div className="relative p-5">
            <button
              type="button"
              onClick={closePanel}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-surface-3 transition-colors"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
            <PanelContent />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

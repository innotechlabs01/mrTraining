'use client'

import { useState } from 'react'
import { Plus, MapPin, Timer, Zap } from 'lucide-react'

export interface RunningIntervalRow {
  order: number
  workType: 'time' | 'distance'
  workValue: number
  restSeconds: number
  paceTarget?: string
  intensity?: 'easy' | 'tempo' | 'threshold' | 'vo2max'
}

interface RunningIntervalEditorProps {
  intervals: RunningIntervalRow[]
  onChange: (intervals: RunningIntervalRow[]) => void
}

const INTENSITY_OPTIONS = [
  { value: 'easy', label: 'Fácil', color: '#22c55e' },
  { value: 'tempo', label: 'Tempo', color: '#eab308' },
  { value: 'threshold', label: 'Umbral', color: '#f97316' },
  { value: 'vo2max', label: 'VO₂max', color: '#ef4444' },
] as const

const WORK_TYPE_OPTIONS = [
  { value: 'time', label: 'Tiempo', icon: Timer },
  { value: 'distance', label: 'Distancia', icon: MapPin },
] as const

export function RunningIntervalEditor({ intervals, onChange }: RunningIntervalEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null)

  const updateInterval = (index: number, field: string, value: string | number) => {
    const newIntervals = [...intervals]
    newIntervals[index] = { ...newIntervals[index], [field]: value }
    onChange(newIntervals)
  }

  const addInterval = () => {
    const nextOrder = intervals.length > 0 ? Math.max(...intervals.map(i => i.order)) + 1 : 1
    onChange([...intervals, { order: nextOrder, workType: 'time', workValue: 60, restSeconds: 60, paceTarget: '', intensity: 'easy' }])
  }

  const removeInterval = (index: number) => {
    const newIntervals = intervals.filter((_, i) => i !== index)
    onChange(newIntervals.map((i, idx) => ({ ...i, order: idx + 1 })))
  }

  return (
    <div className="space-y-2">
      {intervals.length === 0 ? (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-white/50 mb-3">No hay intervalos definidos. Agrega el primero:</p>
          <button
            type="button"
            onClick={addInterval}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-sm font-medium rounded-lg hover:bg-brand-primary/30 transition-colors"
          >
            <Plus size={16} /> Agregar primer intervalo
          </button>
        </div>
      ) : (
        <>
          {intervals.map((interval, index) => (
            <div key={String(interval.order)} className="bg-white/5 rounded-lg border border-white/10 p-3">
              <div className="flex items-start gap-2 mb-2">
                <div className="flex flex-col items-center justify-center w-8 text-white/40 text-xs font-mono">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Tipo</label>
                      <select
                        value={interval.workType}
                        onChange={e => updateInterval(index, 'workType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-brand-primary focus:outline-none"
                      >
                        {WORK_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">
                        {interval.workType === 'time' ? 'Tiempo (s)' : 'Distancia (km)'}
                      </label>
                      <input
                        type="number"
                        step={interval.workType === 'time' ? 1 : 0.1}
                        min={1}
                        value={interval.workValue}
                        onChange={e => updateInterval(index, 'workValue', Number(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Descanso (s)</label>
                      <input
                        type="number"
                        min={0}
                        value={interval.restSeconds}
                        onChange={e => updateInterval(index, 'restSeconds', Number(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Pace objetivo</label>
                      <input
                        type="text"
                        placeholder="5:30"
                        value={interval.paceTarget ?? ''}
                        onChange={e => updateInterval(index, 'paceTarget', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-brand-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Intensidad</label>
                      <select
                        value={interval.intensity ?? ''}
                        onChange={e => updateInterval(index, 'intensity', e.target.value || '')}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-brand-primary focus:outline-none"
                      >
                        <option value="">—</option>
                        {INTENSITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ color: opt.color }}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === interval.order ? null : interval.order)}
                    className="text-xs text-white/50 hover:text-white/70"
                  >
                    {editingId === interval.order ? 'Listo' : 'Editar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeInterval(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {intervals.length > 0 && (
            <button
              type="button"
              onClick={addInterval}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              <Plus size={16} /> Agregar intervalo
            </button>
          )}
          <p className="text-xs text-white/30 text-center mt-2">
            {intervals.length} intervalo{intervals.length !== 1 ? 's' : ''} • Total trabajo: {intervals.reduce((sum, i) => sum + (i.workType === 'time' ? i.workValue : 0), 0)}s
          </p>
        </>
      )}
    </div>
  )
}
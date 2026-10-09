'use client'

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + 'T12:00:00').getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return `hace ${Math.floor(days / 7)} sem`
}

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps',
  triceps: 'Tríceps', legs: 'Piernas', glutes: 'Glúteos', hamstrings: 'Isquios',
  quads: 'Cuádriceps', calves: 'Gemelos', core: 'Core', forearms: 'Antebrazos', full_body: 'Cuerpo completo',
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra', dumbbell: 'Mancuernas', kettlebell: 'Kettlebell',
  machine: 'Máquina', cable: 'Polea', bodyweight: 'Peso corporal',
  bands: 'Bandas', medicine_ball: 'Balón medicinal', ez_bar: 'Barra Z',
  smith_machine: 'Smith',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez', daily: 'Diaria', weekly: 'Semanal', custom: 'Personalizada',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

export const GOAL_LABELS: Record<string, string> = {
  strength: 'Fuerza', hypertrophy: 'Hipertrofia', endurance: 'Resistencia',
  speed: 'Velocidad', power: 'Potencia', mobility: 'Movilidad', conditioning: 'Acondicionamiento',
}

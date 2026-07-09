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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + 'T12:00:00').getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)}w ago`
}

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', legs: 'Legs', glutes: 'Glutes', hamstrings: 'Hamstrings',
  quads: 'Quads', calves: 'Calves', core: 'Core', full_body: 'Full Body',
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell',
  machine: 'Machine', cable: 'Cable', bodyweight: 'Bodyweight',
  bands: 'Bands', medicine_ball: 'Medicine Ball', ez_bar: 'EZ Bar',
  smith_machine: 'Smith Machine',
}

export const GOAL_LABELS: Record<string, string> = {
  strength: 'Strength', hypertrophy: 'Hypertrophy', endurance: 'Endurance',
  speed: 'Speed', power: 'Power', mobility: 'Mobility', conditioning: 'Conditioning',
}

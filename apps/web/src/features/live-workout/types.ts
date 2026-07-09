// Domain types for the Live Workout Experience (Experience 07).
// A guided, real-time follow-along session driven by a single state machine.

export type LivePhase = 'idle' | 'work' | 'rest' | 'transition' | 'complete'

export type CueTone = 'tip' | 'praise' | 'correction' | 'motivation'

export interface LiveCoachCue {
  id: string
  tone: CueTone
  text: string
}

export interface LiveExercise {
  id: string
  name: string
  section: 'warmup' | 'main' | 'cooldown'
  sets: number
  /** Seconds of active work per set (drives the real-time timer). */
  duration: number
  /** Seconds of rest between sets. */
  rest: number
  muscleGroups: string[]
  equipment?: string
  /** Demo video (best-effort; falls back to an animated stage). */
  videoUrl?: string
  formTips: string[]
  cues: LiveCoachCue[]
}

export interface MusicTrack {
  id: string
  title: string
  artist: string
  durationSec: number
  url: string
  bpm: number
}

export interface LiveWorkoutPlan {
  id: string
  name: string
  focus: string
  coachName: string
  coachInitials: string
  estimatedDuration: number
  exercises: LiveExercise[]
  playlist: MusicTrack[]
}

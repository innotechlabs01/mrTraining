import type { LucideIcon } from 'lucide-react'

export type TimeBlockId =
  | 'morning-brief'
  | 'check-in'
  | 'session-prep'
  | 'live-session'
  | 'mid-day'
  | 'program-design'
  | 'communication'
  | 'insights'
  | 'daily-summary'

export interface TimeBlock {
  id: TimeBlockId
  label: string
  time: string
  endTime: string
  icon: string
  status: 'upcoming' | 'current' | 'past'
}

export interface AthleteReadiness {
  sleep: number
  hrv: number
  recovery: number
  score: number
}

export interface AthleteFlag {
  type: 'readiness' | 'injury' | 'message' | 'attendance' | 'performance'
  severity: 'low' | 'medium' | 'high'
  message: string
}

export interface AthleteBrief {
  id: string
  name: string
  avatarUrl?: string
  sport: string
  readiness: AthleteReadiness
  flag?: AthleteFlag
  todaySessionIds: string[]
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  rest: number
  weight?: number
  videoUrl?: string
  notes?: string
}

export interface AiSuggestion {
  id: string
  type: 'adjustment' | 'insight' | 'message' | 'generation' | 'anomaly' | 'recommendation'
  title: string
  description: string
  reasoning: string
  actionLabel: string
  dismissed?: boolean
  applied?: boolean
}

export type SessionStatus = 'planned' | 'ready' | 'in-progress' | 'completed'

export interface CoachSession {
  id: string
  name: string
  time: string
  endTime: string
  location: string
  athleteIds: string[]
  status: SessionStatus
  exercises: Exercise[]
  aiAdjustments?: AiSuggestion[]
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  type: 'text' | 'announcement' | 'ai-suggested'
}

export interface MessageThread {
  id: string
  participants: { id: string; name: string; avatarUrl?: string }[]
  lastMessage: Message
  unread: boolean
  messages: Message[]
}

export interface AiGeneratedProgram {
  id: string
  days: string[]
  focus: string
  intensity: 'low' | 'medium' | 'high'
  sessions: { day: string; exercises: Exercise[] }[]
  reasoning: string
}

export interface TomorrowPreview {
  athleteCount: number
  sessionCount: number
  suggestedFocus: string
}

export interface DailySummary {
  date: string
  athleteCount: number
  sessionCount: number
  completedSessions: number
  completedSessionNames: string[]
  messageCount: number
  notesCount: number
  highlights: string[]
  aiRecommendation: string
  tomorrowPreview: TomorrowPreview
}

export type PanelType = 'athlete' | 'message' | 'session' | 'exercise' | null

export interface PanelState {
  type: PanelType
  data: Record<string, unknown>
}

export interface TodayData {
  date: string
  athleteCount: number
  sessionCount: number
  blockIds: TimeBlockId[]
}

export interface CoachingStats {
  morningCompleted: number
  morningTotal: number
  prsToday: number
  flagsForFollowUp: number
  afternoonSessions: string[]
}

export interface AiProgramParams {
  days: string[]
  focus: 'strength' | 'endurance' | 'speed' | 'mixed'
  intensity: 'low' | 'medium' | 'high'
  duration: number
}

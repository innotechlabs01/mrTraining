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
  | 'evening-recap'

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

export type PanelType = 'athlete' | 'message' | 'session' | 'exercise' | 'timeblock' | null

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

export type TrainingMode = 'virtual' | 'presencial' | 'hibrido' | 'running'

export interface DashboardMetrics {
  monthlyRevenue: number
  revenueTrend: number
  activeAthletes: number
  athleteTrend: number
  newAthletesThisMonth: number
  newAthleteTrend: number
  pendingPayments: number
  pendingPaymentCount: number
  overduePaymentCount: number
  todaySessions: number
  todaySessionsCompleted: number
  upcomingEvents: number
}

export interface RevenuePoint {
  month: string
  amount: number
}

export interface PlanDiscount {
  type: 'percentage' | 'fixed'
  value: number
  label?: string
  validFrom?: string
  validUntil?: string
  code?: string
}

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  billingPeriod: 'monthly' | 'quarterly' | 'yearly'
  trainingMode: TrainingMode[]
  maxAthletes: number
  maxSessionsPerWeek: number
  features: string[]
  isActive: boolean
  athleteCount: number
  discount?: PlanDiscount | null
}

export type EventFormat = 'lista' | 'formulario' | 'running'

export type EventFormFieldKind = 'text' | 'multiple' | 'select'

export interface EventFormField {
  id: string
  label: string
  kind: EventFormFieldKind
  options?: string[]
  required?: boolean
}

export interface CoachEvent {
  id: string
  title: string
  date: string
  time: string
  endTime: string
  type: 'competition' | 'meeting' | 'reunion' | 'evaluacion' | 'other'
  modality: TrainingMode
  location?: string
  description?: string
  athleteIds: string[]
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  format?: EventFormat
  formFields?: EventFormField[]
  listItems?: string[]
  running?: {
    distanceKm?: number
    meetingPoint?: string
    pace?: string
  }
  public?: boolean
}

// ---- Live Sessions (calendar) ----

export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface LiveSessionItem {
  id: string
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  modality: TrainingMode
  location?: string
  notes?: string
  public: boolean
  capacity: number
  enrolled: number
  status: LiveSessionStatus
  link?: string
  distanceKm?: number
  pace?: string
}

export interface AssignedWorkout {
  id: string
  athleteId: string
  athleteName: string
  contentId: string
  contentType: 'workout' | 'program'
  contentName: string
  modality: TrainingMode
  startDate: string
  endDate: string
  daysOfWeek: number[]
  status: 'active' | 'completed' | 'paused'
  progress: number
}

export interface PublicPageConfig {
  brandName: string
  tagline?: string
  welcomeMessage?: string
  footerText: string
}

export type NavSectionId =
  | 'dashboard'
  | 'users'
  | 'training'
  | 'training-workouts'
  | 'training-programs'
  | 'training-asignar'
  | 'planes'
  | 'events'
  | 'settings'
  | 'support'
  | 'timeline'

export interface NavItem {
  id: NavSectionId
  label: string
  icon: string
  href?: string
  children?: NavItem[]
}

// ---- Support / Help desk ----

export type TicketStatus = 'open' | 'resolved'
export type TicketCategory = 'problem' | 'question' | 'feedback'
export type TicketPriority = 'low' | 'medium' | 'high'
export type TicketAuthor = 'coach' | 'support'

export interface TicketMessage {
  id: string
  author: TicketAuthor
  body: string
  imageUrl?: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  number: number
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  resolvedAt?: string
  messages: TicketMessage[]
}

// ---- Coach payment methods (only bank transfer) ----

export type AccountType = 'checking' | 'savings'

export interface PaymentMethod {
  id: string
  bank: string
  holder: string
  accountType: AccountType
  accountNumber: string
  clabe: string
  notes?: string
}

/** A transfer method is only enabled/visible to users once its info is complete. */
export function isPaymentMethodComplete(m: PaymentMethod): boolean {
  return Boolean(m.bank && m.holder && m.accountNumber && m.clabe)
}

// ---- Sales / inventory (coach emprendimiento) ----

export interface Product {
  id: string
  name: string
  brand?: string
  imageUrl?: string
  price: number // precio de venta (lo que paga el cliente)
  received: number // precio recibido por el coach (neto por unidad)
  gross: number // precio bruto (antes de descuento/impuesto)
  stock: number
  lowStockThreshold: number
  createdAt: string
}

export interface Sale {
  id: string
  productId: string
  productName: string
  brand?: string
  quantity: number
  unitPrice: number // snapshot del precio de venta
  unitReceived: number // snapshot del precio recibido
  total: number
  date: string // YYYY-MM-DD
  createdAt: string
}

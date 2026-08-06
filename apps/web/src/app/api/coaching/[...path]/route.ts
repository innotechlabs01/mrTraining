import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getTimeBlocks, saveTimeBlocks,
  getAthletes, getAthleteById, saveAthlete, deleteAthlete,
  getSessions, saveSession, deleteSession,
  getMessageThreads, saveMessage, createThread,
  getDailySummary,
  getEvents, saveEvent, deleteEvent,
  getPlans, savePlan, deletePlan,
  getTickets, saveTicket,
  getAssignedWorkouts, saveAssignedWorkout, deleteAssignedWorkout,
  getAISuggestions, saveAISuggestion,
  getLiveSessions, saveLiveSession, deleteLiveSession,
  getProducts, saveProduct, deleteProduct,
  getSales, saveSale, deleteSale,
  getDashboard,
  getPaymentMethods, savePaymentMethod, deletePaymentMethod,
  getPublicPageConfig, savePublicPageConfig,
  getAthleteMembership, createMembership, cancelMembership, getPaymentHistory, getAthleteMembershipsByCoach,
  getCoachAppointments, createAppointment, updateAppointment, getAthleteAppointment,
  getCoachAvailability, saveCoachAvailability,
} from '@/lib/coaching-db'

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getCoachId(): Promise<string | null> {
  try {
    const { userId } = await auth()
    return userId || null
  } catch {
    return null
  }
}

type EntityHandler = (coachId: string, id: string | undefined, method: string, body: unknown) => Promise<unknown>

const handlers: Record<string, EntityHandler> = {
  'time-blocks': async (coachId, _id, method, body) => {
    if (method === 'GET') return getTimeBlocks(coachId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (method === 'POST') { await saveTimeBlocks(coachId, body as any); return { ok: true } }
    return null
  },
  athletes: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getAthletes(coachId)
    if (method === 'GET' && id) return getAthleteById(coachId, id)
    if (method === 'POST') { const newId = await saveAthlete(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveAthlete(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteAthlete(coachId, id); return { ok: true } }
    return null
  },
  sessions: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getSessions(coachId)
    if (method === 'POST') { const newId = await saveSession(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveSession(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteSession(coachId, id); return { ok: true } }
    return null
  },
  messages: async (coachId, id, method, body) => {
    if (method === 'GET') return getMessageThreads(coachId)
    if (method === 'POST' && id) { const msgId = await saveMessage(coachId, id, body as Record<string, unknown>); return { id: msgId } }
    if (method === 'PUT') { const threadId = await createThread(coachId, body as Record<string, unknown>); return { id: threadId } }
    return null
  },
  'daily-summary': async (coachId, _id, method, _body) => {
    if (method === 'GET') return getDailySummary(coachId)
    return null
  },
  events: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getEvents(coachId)
    if (method === 'POST') { const newId = await saveEvent(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveEvent(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteEvent(coachId, id); return { ok: true } }
    return null
  },
  plans: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getPlans(coachId)
    if (method === 'POST') { const newId = await savePlan(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await savePlan(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deletePlan(coachId, id); return { ok: true } }
    return null
  },
  tickets: async (coachId, _id, method, body) => {
    if (method === 'GET') return getTickets(coachId)
    if (method === 'POST') { const newId = await saveTicket(coachId, body as Record<string, unknown>); return { id: newId } }
    return null
  },
  'assigned-workouts': async (coachId, id, method, body) => {
    if (method === 'GET') return getAssignedWorkouts(coachId)
    if (method === 'POST') { const newId = await saveAssignedWorkout(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveAssignedWorkout(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteAssignedWorkout(coachId, id); return { ok: true } }
    return null
  },
  'ai-suggestions': async (coachId, _id, method, body) => {
    if (method === 'GET') return getAISuggestions(coachId)
    if (method === 'POST') { const newId = await saveAISuggestion(coachId, body as Record<string, unknown>); return { id: newId } }
    return null
  },
  'live-sessions': async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getLiveSessions(coachId)
    if (method === 'POST') { const newId = await saveLiveSession(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveLiveSession(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteLiveSession(coachId, id); return { ok: true } }
    return null
  },
  products: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getProducts(coachId)
    if (method === 'POST') { const newId = await saveProduct(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await saveProduct(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deleteProduct(coachId, id); return { ok: true } }
    return null
  },
  sales: async (coachId, id, method, body) => {
    if (method === 'GET') return getSales(coachId)
    if (method === 'POST') { const newId = await saveSale(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'DELETE' && id) { await deleteSale(coachId, id); return { ok: true } }
    return null
  },
  dashboard: async (coachId, _id, method, _body) => {
    if (method === 'GET') return getDashboard(coachId)
    return null
  },
  'payment-methods': async (coachId, id, method, body) => {
    if (method === 'GET') return getPaymentMethods(coachId)
    if (method === 'POST') { const newId = await savePaymentMethod(coachId, body as Record<string, unknown>); return { id: newId } }
    if (method === 'PUT' && id) { await savePaymentMethod(coachId, { ...(body as Record<string, unknown>), id }); return { ok: true } }
    if (method === 'DELETE' && id) { await deletePaymentMethod(coachId, id); return { ok: true } }
    return null
  },
  'public-page': async (coachId, _id, method, body) => {
    if (method === 'GET') return getPublicPageConfig(coachId)
    if (method === 'PUT') { await savePublicPageConfig(coachId, body as Record<string, unknown>); return { ok: true } }
    return null
  },
  membership: async (coachId, id, method, body) => {
    if (method === 'GET' && id) return getAthleteMembership(id)
    if (method === 'GET' && !id) return { error: 'athleteId required' }
    if (method === 'POST') {
      const b = body as { athleteId: string; planId?: string; planName: string; planPrice: number; billingPeriod?: string; startDate?: string }
      const newId = await createMembership(coachId, b); return { id: newId }
    }
    if (method === 'DELETE' && id) { await cancelMembership(id); return { ok: true } }
    return null
  },
  'payment-history': async (_coachId, id, _method, _body) => {
    if (id) return getPaymentHistory(id)
    return null
  },
  memberships: async (coachId, _id, _method, _body) => {
    return getAthleteMembershipsByCoach(coachId)
  },
  appointments: async (coachId, id, method, body) => {
    if (method === 'GET' && !id) return getCoachAppointments(coachId)
    if (method === 'GET' && id) return getAthleteAppointment(id)
    if (method === 'POST') {
      const b = body as { athleteId: string; athleteName: string; date: string; startTime: string; endTime: string; athleteSports?: string[]; athleteModality?: string; athleteLevel?: string; athleteGoal?: string; athleteFrequency?: number; athleteDuration?: number; athleteEquipment?: string; athleteRoutineAccepted?: boolean }
      const newId = await createAppointment({ ...b, coachId })
      return { id: newId }
    }
    if (method === 'PUT' && id) {
      const b = body as { status?: string; notes?: string; date?: string; startTime?: string; endTime?: string }
      await updateAppointment(id, b)
      return { ok: true }
    }
    return null
  },
  'coach-availability': async (coachId, _id, method, body) => {
    if (method === 'GET') return getCoachAvailability(coachId)
    if (method === 'POST') {
      await saveCoachAvailability(coachId, body as Array<{ dayOfWeek: number; startTime: string; endTime: string }>)
      return { ok: true }
    }
    return null
  },
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params, 'POST')
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params, 'PUT')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params, 'DELETE')
}

async function handleRequest(
  req: NextRequest,
  params: { path: string[] },
  method: string
): Promise<NextResponse> {
  const coachId = await getCoachId()
  if (!coachId) {
    return errorResponse('Unauthorized', 401)
  }

  const [entity, id] = params.path
  const handler = handlers[entity]

  if (!handler) {
    return errorResponse(`Unknown entity: ${entity}`, 404)
  }

  let body: unknown = null
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  try {
    const result = await handler(coachId, id, method, body)
    if (result === null) {
      return errorResponse('Method not allowed', 405)
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error(`Coaching API error [${method} ${entity}]:`, err)
    return errorResponse('Internal server error', 500)
  }
}

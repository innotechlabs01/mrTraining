// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB } from './db'

// ============== Daily Summary ==============

export async function getDailySummary(coachId: string, date?: string) {
  const db = getDB()
  const targetDate = date || new Date().toISOString().split('T')[0]
  const result = await db.execute(
    'SELECT * FROM daily_summaries WHERE coach_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
    [coachId, targetDate],
  )
  if (result.rows.length === 0) return null
  const s = result.rows[0]
  const highlights = await db.execute('SELECT text FROM daily_highlights WHERE summary_id = ? ORDER BY sort_order', [s.id])
  const names = await db.execute('SELECT name FROM completed_session_names WHERE summary_id = ?', [s.id])
  return {
    date: s.date as string,
    athleteCount: s.athlete_count as number,
    sessionCount: s.session_count as number,
    completedSessions: s.completed_sessions as number,
    completedSessionNames: names.rows.map(n => n.name as string),
    messageCount: s.message_count as number,
    notesCount: s.notes_count as number,
    highlights: highlights.rows.map(h => h.text as string),
    aiRecommendation: s.ai_recommendation as string || '',
    tomorrowPreview: {
      athleteCount: s.tomorrow_athlete_count as number,
      sessionCount: s.tomorrow_session_count as number,
      suggestedFocus: s.tomorrow_focus as string || '',
    },
  }
}

// ============== Dashboard ==============

export async function getDashboard(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM dashboard_metrics WHERE coach_id = ?',
    [coachId],
  )
  if (result.rows.length === 0) return null
  const d = result.rows[0]
  const revenue = await db.execute('SELECT * FROM revenue_history WHERE coach_id = ? ORDER BY month', [coachId])
  const distribution = await db.execute('SELECT * FROM plan_distribution WHERE coach_id = ?', [coachId])
  const activity = await db.execute('SELECT * FROM recent_activity WHERE coach_id = ? ORDER BY created_at DESC LIMIT 10', [coachId])
  return {
    metrics: {
      monthlyRevenue: d.monthly_revenue, revenueTrend: d.revenue_trend,
      activeAthletes: d.active_athletes, athleteTrend: d.athlete_trend,
      newAthletesThisMonth: d.new_athletes_this_month, newAthleteTrend: d.new_athlete_trend,
      pendingPayments: d.pending_payments, pendingPaymentCount: d.pending_payment_count, overduePaymentCount: d.overdue_payment_count,
      todaySessions: d.today_sessions, todaySessionsCompleted: d.today_sessions_completed, upcomingEvents: d.upcoming_events,
    },
    extra: {
      revenueGoal: d.revenue_goal as number, newAthletesGoal: d.new_athletes_goal as number,
      streakDays: d.streak_days as number, bestStreak: d.best_streak as number,
      planDistribution: distribution.rows.map(p => ({ name: p.plan_name, athletes: p.athletes, revenue: p.revenue, color: p.color })),
      recentActivity: activity.rows.map(a => ({ id: a.id, icon: a.icon, text: a.text, time: a.time })),
    },
    revenueHistory: revenue.rows.map(r => ({ month: r.month, amount: r.amount })),
  }
}

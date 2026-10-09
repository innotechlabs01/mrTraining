import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { DashboardMetrics, RevenuePoint } from '@/features/coach/types';

export const dynamic = 'force-dynamic';

const GO = process.env.NEXT_PUBLIC_GO_API_URL || '';

const DEFAULT_REVENUE_GOAL = 15000;
const DEFAULT_ATHLETE_GOAL = 10;

const PLAN_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(dateStr: string): string {
  return (dateStr || '').slice(0, 7);
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'short' });
}

function trend(cur: number, prev: number): number {
  if (prev > 0) return Math.round(((cur - prev) / prev) * 100);
  return cur > 0 ? 100 : 0;
}

interface GoAthlete {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface GoEvent {
  id: string;
  title: string;
  date: string;
  created_at: string;
}

interface GoSale {
  id: string;
  product_name: string;
  total: number;
  date: string;
  created_at: string;
}

interface GoMembership {
  id: string;
  athlete_id: string;
  plan_name: string;
  plan_price: number;
  status: string;
  created_at: string;
}

async function goGet(token: string, path: string): Promise<unknown[]> {
  const res = await fetch(`${GO}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`go ${path}: ${res.status}`);
  const json = (await res.json()) as unknown;
  if (Array.isArray(json)) return json as unknown[];
  const data = (json as { data?: unknown[] }).data;
  return Array.isArray(data) ? data : [];
}

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = todayKey();
  const thisMonth = monthKey(today);
  const lastMonth = prevMonthKey(thisMonth);

  const [athletes, events, sales, memberships] = await Promise.all([
    goGet(token, '/api/v1/coaches/me/athletes').catch(() => [] as GoAthlete[]),
    goGet(token, '/api/v1/events').catch(() => [] as GoEvent[]),
    goGet(token, '/api/v1/coaches/sales').catch(() => [] as GoSale[]),
    goGet(token, '/api/v1/coaches/memberships').catch(() => [] as GoMembership[]),
  ]);

  const saleList = sales as GoSale[];
  const athleteList = athletes as GoAthlete[];
  const eventList = events as GoEvent[];
  const membershipList = memberships as GoMembership[];

  const monthlyRevenue = saleList
    .filter((s) => monthKey(s.date) === thisMonth)
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const prevRevenue = saleList
    .filter((s) => monthKey(s.date) === lastMonth)
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const activeAthletes = athleteList.filter((a) => a.is_active !== false).length;
  const newAthletesThisMonth = athleteList.filter((a) => monthKey(a.created_at) === thisMonth).length;
  const newAthletesLastMonth = athleteList.filter((a) => monthKey(a.created_at) === lastMonth).length;

  const pastDue = membershipList.filter((m) => m.status === 'past_due');
  const expired = membershipList.filter((m) => m.status === 'expired');
  const pendingPayments = [...pastDue, ...expired].reduce((sum, m) => sum + (m.plan_price || 0), 0);
  const pendingPaymentCount = pastDue.length;
  const overduePaymentCount = expired.length;

  const metrics: DashboardMetrics = {
    monthlyRevenue: Math.round(monthlyRevenue),
    revenueTrend: trend(monthlyRevenue, prevRevenue),
    activeAthletes,
    athleteTrend: trend(newAthletesThisMonth, newAthletesLastMonth),
    newAthletesThisMonth,
    newAthleteTrend: trend(newAthletesThisMonth, newAthletesLastMonth),
    pendingPayments: Math.round(pendingPayments),
    pendingPaymentCount,
    overduePaymentCount,
    todaySessions: eventList.filter((e) => e.date === today).length,
    todaySessionsCompleted: 0,
    upcomingEvents: eventList.filter((e) => e.date >= today).length,
  };

  const revenueHistory: RevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const amount = saleList
      .filter((s) => monthKey(s.date) === key)
      .reduce((sum, s) => sum + (s.total || 0), 0);
    revenueHistory.push({ month: shortMonth(key), amount: Math.round(amount) });
  }

  const planCounts = new Map<string, number>();
  for (const m of membershipList) {
    if (m.status === 'active' || m.status === 'trial') {
      const name = m.plan_name || 'Sin plan';
      planCounts.set(name, (planCounts.get(name) || 0) + 1);
    }
  }
  const planDistribution = Array.from(planCounts.entries()).map(([name, count], i) => ({
    name,
    athletes: count,
    revenue: 0,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  const athleteName = (id: string): string | undefined =>
    athleteList.find((a) => a.id === id)?.name;

  const activity: Array<{ id: string; icon: string; text: string; time: string }> = [];
  for (const m of membershipList.slice(0, 4)) {
    const n = athleteName(m.athlete_id);
    if (n) {
      activity.push({
        id: `m-${m.id}`,
        icon: 'user',
        text: `${n} se unió al plan ${m.plan_name || 'Sin plan'}`,
        time: new Date(m.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      });
    }
  }
  for (const s of saleList.slice(0, 4)) {
    activity.push({
      id: `s-${s.id}`,
      icon: 'payment',
      text: `Venta registrada: ${s.product_name || 'producto'} por $${Math.round(s.total || 0)}`,
      time: new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    });
  }
  for (const e of eventList.slice(0, 2)) {
    activity.push({
      id: `e-${e.id}`,
      icon: 'event',
      text: `Evento: ${e.title}`,
      time: new Date(e.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    });
  }

  return NextResponse.json({
    metrics,
    extra: {
      revenueGoal: DEFAULT_REVENUE_GOAL,
      newAthletesGoal: DEFAULT_ATHLETE_GOAL,
      streakDays: 0,
      bestStreak: 0,
      planDistribution,
      recentActivity: activity,
    },
    revenueHistory,
  });
}
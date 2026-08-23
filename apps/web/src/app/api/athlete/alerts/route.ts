import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getHealthMetrics, getSleepLogs, listSessionSetLogs, getWorkoutDetail } from '@/lib/coaching-db';

interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
}

// GET /api/athlete/alerts — compute alerts based on health + training data.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const alerts: Alert[] = [];

    // 1. HRV below baseline alert
    const hrv = await getHealthMetrics(athlete.id, { metricType: 'hrv', daysBack: 8 });
    if (hrv.length >= 2) {
      const sorted = [...hrv].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      const today = sorted[0].value;
      const baseline = sorted.slice(1).reduce((s, m) => s + m.value, 0) / (sorted.length - 1);
      if (baseline > 0 && today < baseline * 0.8) {
        alerts.push({
          type: 'hrv_low',
          severity: 'medium',
          title: 'HRV bajo tu promedio',
          message: `Tu HRV de hoy (${Math.round(today)}ms) está ${Math.round(((baseline - today) / baseline) * 100)}% por debajo de tu baseline (${Math.round(baseline)}ms). Considerá una sesión suave.`,
        });
      }
    }

    // 2. Sleep deficit alert
    const sleep = await getSleepLogs(athlete.id, 3);
    if (sleep.length > 0) {
      const lastNight = sleep[0];
      if (lastNight.totalMinutes < 360) { // < 6 hours
        alerts.push({
          type: 'sleep_deficit',
          severity: 'medium',
          title: 'Sueño insuficiente',
          message: `Dormiste solo ${(lastNight.totalMinutes / 60).toFixed(1)}h anoche. Necesitás al menos 7h para una buena recuperación.`,
        });
      }
    }

    // 3. No sync in 48h alert
    const lastSync = await getHealthMetrics(athlete.id, { metricType: 'hrv', daysBack: 3 });
    if (lastSync.length === 0) {
      alerts.push({
        type: 'sync_stale',
        severity: 'low',
        title: 'Sin sync del reloj',
        message: 'No hay datos de tu reloj en las últimas 48 horas. Abrí la app de Recovery para sincronizar.',
      });
    }

    return NextResponse.json({ alerts }, { status: 200 });
  } catch (error) {
    console.error('Error computing alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

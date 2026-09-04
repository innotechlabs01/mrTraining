import { NextResponse } from 'next/server';
import { getNats } from '@/lib/nats';
import { getDB, safeExecute } from '@/lib/db/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let started = false;

export async function GET() {
  if (started) {
    return NextResponse.json({ status: 'already_running' });
  }
  started = true;

  const nc = await getNats();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const js = nc.jetstream() as any;

  const stream = 'ATHLETE_STREAM';
  const subjects = [
    'athlete.session.completed',
    'athlete.session.set.logged',
    'athlete.session.progress',
  ];

  try {
    await js.streams.add({ name: stream, subjects, retention: 'limits', max_messages: 100000 });
  } catch {}

  // Consumer for set logged → PR tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setSub = await js.subscribe('athlete.session.set.logged', { durable: 'pr-tracker', deliver_policy: 'all' } as any);
  (async () => {
    for await (const msg of setSub) {
      try {
        const data = JSON.parse(Buffer.from(msg.data).toString());
        const { athleteClerkId, exerciseId, reps, weight, loggedAt } = data;
        if (reps && weight && exerciseId) {
          const db = getDB();
          await safeExecute(
            db,
            `INSERT INTO athlete_prs (athlete_clerk_id, exercise_id, reps, weight, volume, logged_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(athlete_clerk_id, exercise_id) DO UPDATE SET
               reps = CASE WHEN ? > reps THEN ? ELSE reps END,
               weight = CASE WHEN ? > weight THEN ? ELSE weight END,
               volume = reps * weight,
               logged_at = ?`,
            [athleteClerkId, exerciseId, reps, weight, reps * weight, loggedAt, reps, reps, weight, weight, loggedAt]
          );
        }
        await msg.ack();
      } catch (e) {
        console.error('[NATS consumer] set error', e);
      }
    }
  })();

  // Consumer for session completed → stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedSub = await js.subscribe('athlete.session.completed', { durable: 'session-completed', deliver_policy: 'all' } as any);
  (async () => {
    for await (const msg of completedSub) {
      try {
        const data = JSON.parse(Buffer.from(msg.data).toString());
        const { athleteClerkId, sessionId, completedAt } = data;
        const db = getDB();
        await safeExecute(
          db,
          `INSERT INTO athlete_session_stats (athlete_clerk_id, session_id, completed_at, first_seen_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(session_id) DO UPDATE SET completed_at = ?`,
          [athleteClerkId, sessionId, completedAt, completedAt]
        );
        await msg.ack();
      } catch (e) {
        console.error('[NATS consumer] completed error', e);
      }
    }
  })();

  // Consumer for session progress → live volume
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progressSub = await js.subscribe('athlete.session.progress', { durable: 'session-progress', deliver_policy: 'all' } as any);
  (async () => {
    for await (const msg of progressSub) {
      try {
        const data = JSON.parse(Buffer.from(msg.data).toString());
        const { athleteClerkId, sessionId, totalVolume, durationSeconds, updatedAt } = data;
        const db = getDB();
        await safeExecute(
          db,
          `INSERT INTO athlete_session_progress (athlete_clerk_id, session_id, total_volume, duration_seconds, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(session_id) DO UPDATE SET total_volume = COALESCE(?, total_volume), duration_seconds = COALESCE(?, duration_seconds), updated_at = ?`,
          [athleteClerkId, sessionId, totalVolume ?? null, durationSeconds ?? null, updatedAt, totalVolume ?? null, durationSeconds ?? null, updatedAt]
        );
        await msg.ack();
      } catch (e) {
        console.error('[NATS consumer] progress error', e);
      }
    }
  })();

  console.log('[NATS] Consumer started for athlete.session.*');
  return NextResponse.json({ status: 'started' });
}

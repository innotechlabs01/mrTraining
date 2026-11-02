import { connect, type NatsConnection } from 'nats';

let nc: NatsConnection | null = null;

export async function getNats(): Promise<NatsConnection> {
  if (nc) return nc;
  const url = process.env.NATS_URL || 'nats://localhost:4222';
  nc = await connect({ servers: url });
  return nc;
}

export async function publishSessionCompleted(sessionId: string, athleteClerkId: string, completedAt: string) {
  const nc = await getNats();
  const payload = JSON.stringify({ sessionId, athleteClerkId, completedAt });
  await nc.publish('athlete.session.completed', Buffer.from(payload));
}

export async function publishSetLogged(sessionId: string, athleteClerkId: string, exerciseId: string, setNumber: number, reps?: number | null, weight?: number | null, rpe?: number | null) {
  const nc = await getNats();
  const payload = JSON.stringify({ sessionId, athleteClerkId, exerciseId, setNumber, reps, weight, rpe, loggedAt: new Date().toISOString() });
  await nc.publish('athlete.session.set.logged', Buffer.from(payload));
}

export async function publishSessionProgress(sessionId: string, athleteClerkId: string, totalVolume?: number | null, durationSeconds?: number | null) {
  const nc = await getNats();
  const payload = JSON.stringify({ sessionId, athleteClerkId, totalVolume, durationSeconds, updatedAt: new Date().toISOString() });
  await nc.publish('athlete.session.progress', Buffer.from(payload));
}

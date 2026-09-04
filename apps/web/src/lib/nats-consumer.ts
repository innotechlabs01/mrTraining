import { getNats } from './nats';

export async function startSessionEventsConsumer() {
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
    await js.streams.add({
      name: stream,
      subjects,
      retention: 'limits',
      max_messages: 100000,
    });
  } catch {
    // stream already exists
  }

  await js.consumers.get(stream, 'session-events');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await js.subscribe('athlete.session.completed', { durable: 'session-events' } as any);
  console.log('[NATS] Consumer listening on athlete.session.*');
}

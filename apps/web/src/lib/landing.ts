import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

type LandingSection = {
  n?: string;
  title: string;
  copy: string;
};

type LandingTrainer = {
  name: string;
  seed: string;
};

type LandingTestimonial = {
  quote: string;
  name: string;
  seed: string;
};

type LandingStat = {
  value: string;
  label: string;
};

export interface LandingData {
  version: number;
  navLinks: string[];
  stats: LandingStat[];
  reasons: LandingSection[];
  trainers: LandingTrainer[];
  testimonials: LandingTestimonial[];
  updatedAt: string;
}

const FALLBACK_DATA: LandingData = {
  version: 1,
  navLinks: ['Home', 'Service', 'Trainers', 'Testimonial', 'Coaching', 'Contact Us'],
  stats: [
    { value: '20+', label: 'Years of Experience' },
    { value: '15K+', label: 'Members Join' },
    { value: '14K+', label: 'Happy Members' },
  ],
  reasons: [
    {
      n: '01',
      title: 'Personal Training',
      copy: 'Our gyms offer personalized training sessions with certified personal trainers who create custom workout plans based on your goals.',
    },
    {
      n: '02',
      title: 'Equipment and Facilities',
      copy: 'Full racks, free weights, and cardio machines, serviced year-round and updated as soon as something wears out.',
    },
    {
      n: '03',
      title: 'Nutrition Counseling',
      copy: 'One-on-one nutrition guidance that fits your training block, not a generic sheet handed out at sign-up.',
    },
    {
      n: '04',
      title: 'Speciality Programs',
      copy: 'Powerlifting, bodybuilding prep, and sport-specific conditioning blocks run by coaches who compete themselves.',
    },
  ],
  trainers: [
    { name: 'Borney Exiteid', seed: 'ig-trainer-1' },
    { name: 'Elsa Windia', seed: 'ig-trainer-2' },
    { name: 'Georege Aryo', seed: 'ig-trainer-3' },
    { name: 'Mika Thornton', seed: 'ig-trainer-4' },
    { name: 'Priya Sharma', seed: 'ig-trainer-5' },
  ],
  testimonials: [
    {
      quote: 'I am extremely grateful for the positive impact gym training has had on my life; through consistent training and expert guidance from coaches, I\'ve witnessed a remarkable transformation in strength, endurance, and overall fitness.',
      name: 'Jhony Breaker',
      seed: 'ig-testi-1',
    },
    {
      quote: 'The coaches here don\'t let you coast. Every session has a plan, and every plan gets adjusted based on how last week actually went.',
      name: 'Maria Ortiz',
      seed: 'ig-testi-2',
    },
    {
      quote: 'Six months ago I couldn\'t do a single pull-up. The specialty program got me to five clean reps, and I\'m still counting.',
      name: 'Dev Patel',
      seed: 'ig-testi-3',
    },
  ],
  updatedAt: new Date().toISOString(),
};

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!TURSO_URL) return null;
  if (client) return client;
  client = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
  return client;
}

async function ensureTable() {
  const c = getClient();
  if (!c) return;
  await c.execute(`
    CREATE TABLE IF NOT EXISTS landing_content (
      id INTEGER PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function getLandingContent(): Promise<LandingData> {
  const c = getClient();
  if (!c) return FALLBACK_DATA;

  try {
    await ensureTable();
    const result = await c.execute(
      'SELECT content, version FROM landing_content ORDER BY version DESC LIMIT 1'
    );
    if (result.rows.length === 0) return FALLBACK_DATA;
    const row = result.rows[0];
    const parsed = JSON.parse(row.content as string) as LandingData;
    return { ...parsed, version: row.version as number };
  } catch {
    return FALLBACK_DATA;
  }
}

export async function updateLandingContent(
  data: Omit<LandingData, 'updatedAt'>
): Promise<LandingData> {
  const c = getClient();
  if (!c) throw new Error('TURSO_URL not configured');

  await ensureTable();
  const now = new Date().toISOString();
  const payload: LandingData = { ...data, updatedAt: now };
  const version = data.version + 1;

  await c.execute(
    'INSERT INTO landing_content (version, content, updated_at) VALUES (?, ?, ?)',
    [version, JSON.stringify(payload), now]
  );

  return payload;
}

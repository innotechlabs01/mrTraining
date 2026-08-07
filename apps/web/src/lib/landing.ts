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

type LandingBrand = {
  colors: {
    primary: string;
  };
  font: string;
  heroSubtitle: string;
  heroPhoto: string;
  heroPhotoAlt: string;
  aboutTitle: string;
  aboutPhoto: string;
  aboutPhotoAlt: string;
  aboutCopy: string[];
  contact: {
    whatsapp: string;
    email: string;
    city: string;
    socialLinks: { label: string; href: string; icon: string }[];
  };
};

export interface LandingData {
  version: number;
  navLinks: string[];
  brand: LandingBrand;
  stats: LandingStat[];
  reasons: LandingSection[];
  trainers: LandingTrainer[];
  testimonials: LandingTestimonial[];
  tienda: LandingSection;
  blog: {
    title: string;
    subtitle: string;
  };
  plans: {
    title: string;
    subtitle: string;
  };
  asesoria: {
    title: string;
    subtitle: string;
  };
  updatedAt: string;
}

const FALLBACK_DATA: LandingData = {
  version: 1,
  navLinks: ['Inicio', 'Sobre MAO', 'Asesoría Online', 'Planes', 'Testimonios', 'Tienda', 'Blog', 'Contacto'],
  brand: {
    colors: {
      primary: '#15aaf2',
    },
    font: "Oswald, var(--font-display)",
    heroSubtitle: 'Transforma tu fuerza en disciplina, tu disciplina en resultado.',
    heroPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1400&h=900&fit=crop',
    heroPhotoAlt: 'Mao levantando una barra con disco',
    aboutTitle: 'Sobre Mao Restrepo',
    aboutPhoto: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=700&h=700&fit=crop',
    aboutPhotoAlt: 'Mao entrenando a un atleta',
    aboutCopy: [
      "Soy Mao Restrepo — entrenador online con más de 8 años de experiencia preparando atletas para fuerza, resistencia y transformación física.",
      "Mi filosofía no se basa en dietas mágicas ni ejercicios viralizados. Se trata de un sistema simple: progresión constante, feedback honesto y un plan que se adapte a tu vida real.",
      "Trabajo con clientes de todo nivel: desde principiantes absolutos hasta atletas competitivos. Lo que todos comparten es un plan a medida — nunca uno-size-fits-all — y una comunicación directa vía WhatsApp para que nunca estés solo en el proceso.",
    ],
    contact: {
      whatsapp: 'https://wa.me/5215512345678',
      email: 'mao@mrtraining.com',
      city: 'Ciudad de México, México',
      socialLinks: [
        { label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram' },
        { label: 'YouTube', href: 'https://youtube.com/', icon: 'youtube' },
      ],
    },
  },
  stats: [
    { value: '12K+', label: 'Horas de Entrenamiento' },
    { value: '8+', label: 'Años de Experiencia' },
    { value: '300+', label: 'Atletas Transformados' },
  ],
  reasons: [
    {
      n: '01',
      title: 'Programación a Medida',
      copy: 'Cada plan se escribe para ti: objetivos, historial, horarios y limitaciones. Sin plantillas compartidas.',
    },
    {
      n: '02',
      title: 'Feedback en Tiempo Real',
      copy: 'Revisamos tus sesiones vía video, ajustamos cargas y corregimos técnica cada semana. No entrenas en soledad.',
    },
    {
      n: '03',
      title: 'Seguimiento Nutricional',
      copy: 'Macros claros, sin restricciones extrema. Planes que caben en tu rutina, no en un libro de cocina.',
    },
    {
      n: '04',
      title: 'Comunidad de Resultados',
      copy: 'Únete a una comunidad privada de atletas que ya transformaron su cuerpo y comparten tips cada día.',
    },
  ],
  trainers: [
    { name: 'Mao Restrepo', seed: 'ig-trainer-1' },
  ],
  testimonials: [
    {
      quote: 'En 12 semanas subí 18 kg a mi press de banca y aprendí a comer sin pasar hambre. La claridad de Mao sobre progresión real es brutal.',
      name: 'Andrés R.',
      seed: 'ig-testi-1',
    },
    {
      quote: 'Vine sin saber levantar una pesa. Ahora marqué mi primera competencia de powerlifting y Mao marcó 1º lugar en mi categoría.',
      name: 'Valeria M.',
      seed: 'ig-testi-2',
    },
    {
      quote: 'La diferencia es que Mao no te deja fallar. Si una semana te fue mal, ya es lunes y ajusta todo. Eso da resultados.',
      name: 'Luis F.',
      seed: 'ig-testi-3',
    },
  ],
  tienda: {
    title: 'Tienda',
    copy: 'Accesorios y suplementos que uso y recomiendo en mis entrenamientos.',
  },
  blog: {
    title: 'Blog',
    subtitle: 'Técnicas, progresos y lecciones detrás del proceso.',
  },
  plans: {
    title: 'Planes',
    subtitle: 'Elige el acompañamiento que se ajuste a tu nivel y objetivo.',
  },
  asesoria: {
    title: 'Asesoría Online',
    subtitle: 'Tu entrenamiento puede tener dirección, estés donde estés.',
  },
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
    return {
      ...FALLBACK_DATA,
      ...parsed,
      brand: { ...FALLBACK_DATA.brand, ...parsed.brand },
      version: row.version as number,
    };
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

export const FALLBACK_BRAND = FALLBACK_DATA.brand;

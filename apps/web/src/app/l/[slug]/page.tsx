import { notFound } from 'next/navigation';

interface LandingSectionItem {
  title?: string;
  copy?: string;
}

interface LandingSection {
  title?: string;
  items?: LandingSectionItem[];
}

interface LandingPage {
  id: string;
  coach_id: string;
  slug: string;
  title: string;
  subtitle: string;
  config: string;
  sections: string;
  images: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default async function PublicLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/l/${params.slug}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    notFound();
  }

  const data: LandingPage = await res.json();

  const sections = data.sections ? JSON.parse(data.sections) : [];
  const images = data.images ? JSON.parse(data.images) : [];
  const config = data.config ? JSON.parse(data.config) : {};

  const primaryColor = config.primary_color || '#15AAF2';

  return (
    <html lang="es">
      <head>
        <title>{data.title}</title>
        <style>
          {`
            body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; }
            .hero { min-height: 70vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); }
            .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.1; }
            .hero h1 .accent { color: ${primaryColor}; }
            .hero p { font-size: 1.25rem; color: #a1a1aa; max-width: 600px; margin: 0 auto 2rem; }
            .sections { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
            .section { margin-bottom: 3rem; }
            .section h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #fff; }
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
            .card { background: #1a1a1a; border: 1px solid #272727; border-radius: 0.75rem; padding: 1.5rem; }
            .card h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
            .card p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; }
            .btn { display: inline-block; background: ${primaryColor}; color: #000; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; }
            .btn:hover { opacity: 0.9; }
          `}
        </style>
      </head>
      <body>
        <header className="hero">
          <h1><span className="accent">{data.title}</span>{data.subtitle ? <span> — {data.subtitle}</span> : null}</h1>
        </header>
        <main className="sections">
          {sections.map((section: LandingSection, i: number) => (
            <section key={i} className="section">
              <h2>{section.title || 'Sección'}</h2>
              <div className="grid-3">
                {(section.items || []).map((item: LandingSectionItem, j: number) => (
                  <div key={j} className="card">
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      </body>
      </html>
    );
}

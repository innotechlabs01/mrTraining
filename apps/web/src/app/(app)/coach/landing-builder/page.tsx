'use client';

import { useEffect, useState } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import {
  Plus, Trash2, Save, Eye, Monitor, Smartphone, Layout, Image as ImageIcon,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface LandingSection {
  id: string;
  title: string;
  items: Array<{ title: string; copy: string }>;
}

interface LandingConfig {
  primary_color: string;
  font: string;
}

interface LandingData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  config: string;
  sections: string;
  images: string;
  is_published: boolean;
}

export default function LandingBuilder() {
  const { user } = useUser();
  const { session } = useSession();
  const [landing, setLanding] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const coachId = user?.id;

  async function getToken() {
    if (!session) return null;
    return session.getToken();
  }

  useEffect(() => {
    if (!coachId) return;
    loadLanding();
  }, [coachId, session]);

  const sections = landing?.sections ? JSON.parse(landing.sections) : [];
  const config = landing?.config ? JSON.parse(landing.config) : {};
  const images = landing?.images ? JSON.parse(landing.images) : [];

  async function loadLanding() {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/coach/landing`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLanding(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveLanding() {
    if (!coachId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/coach/landing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          slug: landing?.slug || `coach-${coachId}`,
          title: landing?.title || 'Mi Entrenamiento',
          subtitle: landing?.subtitle || 'Entrenamiento personalizado',
          config: JSON.stringify(config),
          sections: JSON.stringify(sections),
          images: JSON.stringify(images),
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Guardado correctamente', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: 'Error al guardar', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function addSection() {
    const newSection: LandingSection = {
      id: `section-${Date.now()}`,
      title: 'Nueva Sección',
      items: [{ title: 'Título', copy: 'Descripción' }],
    };
    setLanding(prev => ({
      ...prev!,
      sections: JSON.stringify([...JSON.parse(prev!.sections || '[]'), newSection]),
    }));
  }

  function removeSection(index: number) {
    setLanding(prev => ({
      ...prev!,
      sections: JSON.stringify(JSON.parse(prev!.sections || '[]').filter((_: unknown, i: number) => i !== index)),
    }));
  }

  if (loading) return <div className="p-6 text-text-secondary">Cargando...</div>;
  if (!landing) return <div className="p-6 text-text-secondary">No se pudo cargar la landing</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mi Landing Page</h1>
          <p className="text-text-secondary">Crea tu página pública para atletas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLanding(prev => ({
                ...prev!,
                is_published: !prev!.is_published,
              }));
              saveLanding();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              landing.is_published
                ? 'bg-emerald-400 text-white hover:bg-emerald-300'
                : 'bg-surface-2 border border-surface-3 text-text-primary hover:bg-surface-3'
            }`}
          >
            {landing.is_published ? 'Publicado' : 'No Publicado'}
          </button>
          <button
            onClick={saveLanding}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-surface-1 rounded-xl border border-surface-2 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Slug (URL)</label>
              <input
                type="text"
                value={landing.slug}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Título</label>
              <input
                type="text"
                value={landing.title}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Subtítulo</label>
              <input
                type="text"
                value={landing.subtitle}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Color Primario</label>
              <input
                type="color"
                value={config.primary_color || '#15AAF2'}
                className="w-12 h-12 rounded-lg border-0 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 rounded-xl border border-surface-2 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Secciones</h2>
          <div className="space-y-3">
            {sections.map((section: LandingSection, idx: number) => (
              <div key={section.id} className="border border-surface-2 rounded-lg p-4 bg-surface-2">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={section.title}
                    className="bg-transparent border-none text-sm font-medium text-text-primary focus:ring-0"
                    placeholder="Título de sección"
                  />
                  <button
                    onClick={() => removeSection(idx)}
                    className="text-text-secondary hover:text-rose-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {section.items.map((item: { title: string; copy: string }, j: number) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.title}
                          className="bg-transparent border-none text-sm font-medium text-text-primary"
                          placeholder="Título"
                        />
                        <textarea
                          value={item.copy}
                          className="w-full bg-transparent border-none text-sm text-text-secondary min-h-[60px] focus:ring-0"
                          placeholder="Descripción"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      section.items.push({ title: '', copy: '' });
                      setLanding(prev => ({
                        ...prev!,
                        sections: JSON.stringify(sections),
                      }));
                    }}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    + Agregar elemento
                  </button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="text-text-secondary text-center py-8">No hay secciones. Agrega una abajo.</div>
            )}
          </div>
          <button
            onClick={addSection}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-surface-3 border-dashed text-text-secondary hover:bg-surface-3 transition-colors"
          >
            <Plus size={16} /> Agregar Sección
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <a href={`/l/${landing.slug}`} target="_blank" rel="noopener noreferrer">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-3 text-text-primary hover:bg-surface-2">
              <Eye size={16} /> Ver Landing
            </button>
          </a>
          <a href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-3 text-text-primary hover:bg-surface-2">
            <Layout size={16} /> Ir al Sitio Principal
          </a>
        </div>
      </div>
    </div>
  );
}

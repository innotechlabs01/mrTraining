'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Eye, Send, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import LandingPage from '@/components/landing/LandingPage';
import type { LandingData, LandingBrand, LandingTestimonial } from '@/components/landing/data';
import { isVideoUrl, mediaUrl } from '@/components/landing/data';
import { coachingApi } from '@/features/shared/api/client';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// MediaField — image/video picker that uploads to the Go API and stores the
// returned URL in the draft.
// ---------------------------------------------------------------------------

function MediaField({
  label,
  value,
  onChange,
  accept = 'image/*,video/mp4,video/mov,video/webm',
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 90 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 90MB');
      return;
    }
    setUploading(true);
    try {
      const res = await coachingApi.uploadLandingMedia(file);
      onChange(res.url);
      toast.success('Archivo subido');
    } catch {
      toast.error('Error subiendo archivo');
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = mediaUrl(value);

  return (
    <div>
      <label className="block text-xs font-medium text-white/40">{label}</label>
      <div className="mt-1 flex items-start gap-3">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {previewUrl ? (
            isVideoUrl(value) ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-white/30">
              <ImagePlus size={18} />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <label className={cn(
              'cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10',
              uploading && 'pointer-events-none opacity-50',
            )}>
              {uploading ? <Loader2 size={12} className="inline animate-spin" /> : 'Subir'}
              <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-red-400"
                aria-label="Quitar"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="URL (https://... o /uploads/...)"
            className={inputCls}
          />
          {hint && <p className="text-[11px] text-white/30">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

const inputCls =
  'mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none';

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cn(inputCls, 'resize-y')} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Editor page — module Landing Page. Save = publish (no deploy needed; the
// public landing reads the latest version from the Go API / DB).
// ---------------------------------------------------------------------------

export default function LandingEditorPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await coachingApi.getLanding();
      setData(d);
    } catch {
      toast.error('Error cargando la landing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof LandingData>(key: K, value: LandingData[K]) => {
    if (!data) return;
    setData({ ...data, [key]: value });
  };

  const updateBrand = <K extends keyof LandingBrand>(key: K, value: LandingBrand[K]) => {
    if (!data) return;
    setData({ ...data, brand: { ...data.brand, [key]: value } });
  };

  const handlePublish = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await coachingApi.saveLanding(data);
      toast.success('Landing publicada. Ya está visible en la web pública.');
      await load();
    } catch {
      toast.error('Error publicando la landing');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Landing Page</h1>
          <p className="text-white/50 text-sm">
            Editá tu página pública. Publicar guarda y actualiza la web al instante, sin deploy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">v{data.version}</span>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            <Eye size={16} /> Vista previa
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publicar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Identidad y Hero">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Field label="Color principal" value={data.brand.colors.primary} onChange={(v) => updateBrand('colors', { primary: v })} />
            </div>
            <input
              type="color"
              value={data.brand.colors.primary || '#15aaf2'}
              onChange={(e) => updateBrand('colors', { primary: e.target.value })}
              className="mt-5 h-9 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              aria-label="Selector de color"
            />
          </div>
          <Field label="Tipografía (CSS font-family)" value={data.brand.font || ''} onChange={(v) => updateBrand('font', v)} placeholder="Oswald, sans-serif" />
          <Field label="Tagline del hero" value={data.brand.heroSubtitle} onChange={(v) => updateBrand('heroSubtitle', v)} multiline />
          <MediaField
            label="Imagen o video del hero"
            value={data.brand.heroMedia || data.brand.heroPhoto}
            onChange={(v) => {
              updateBrand('heroMedia', v);
              if (!data.brand.heroPhoto) updateBrand('heroPhoto', v);
            }}
            hint="JPG/PNG/WebP/GIF o video MP4/MOV/WebM (máx 90MB)"
          />
          <Field label="Texto alternativo del hero" value={data.brand.heroPhotoAlt} onChange={(v) => updateBrand('heroPhotoAlt', v)} />
        </Card>

        <Card title="Sobre mí">
          <Field label="Título" value={data.brand.aboutTitle} onChange={(v) => updateBrand('aboutTitle', v)} />
          <MediaField label="Foto" value={data.brand.aboutPhoto} onChange={(v) => updateBrand('aboutPhoto', v)} accept="image/*" />
          <Field label="Texto alternativo de la foto" value={data.brand.aboutPhotoAlt} onChange={(v) => updateBrand('aboutPhotoAlt', v)} />
          <Field
            label="Párrafos (uno por línea)"
            value={data.brand.aboutCopy.join('\n')}
            onChange={(v) => updateBrand('aboutCopy', v.split('\n'))}
            multiline
          />
        </Card>

        <Card title="Estadísticas del hero">
          {data.stats.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s.value} onChange={(e) => update('stats', data.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="12K+" className={cn(inputCls, 'w-24 mt-0')} />
              <input value={s.label} onChange={(e) => update('stats', data.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" className={cn(inputCls, 'mt-0')} />
            </div>
          ))}
        </Card>

        <Card title="Razones (Por qué elegirnos)">
          {data.reasons.map((r, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-white/5 p-3">
              <div className="flex gap-2">
                <input value={r.n} onChange={(e) => update('reasons', data.reasons.map((x, j) => (j === i ? { ...x, n: e.target.value } : x)))} className={cn(inputCls, 'w-14 mt-0')} placeholder="01" />
                <input value={r.title} onChange={(e) => update('reasons', data.reasons.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className={cn(inputCls, 'mt-0')} placeholder="Título" />
              </div>
              <textarea value={r.copy} onChange={(e) => update('reasons', data.reasons.map((x, j) => (j === i ? { ...x, copy: e.target.value } : x)))} rows={2} className={cn(inputCls, 'resize-y')} placeholder="Descripción" />
            </div>
          ))}
        </Card>

        <Card title="Testimonios">
          {data.testimonials.map((ti, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-white/5 p-3">
              <textarea
                value={ti.quote}
                onChange={(e) => update('testimonials', data.testimonials.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)))}
                rows={2}
                className={cn(inputCls, 'resize-y')}
                placeholder="Testimonio"
              />
              <input
                value={ti.name}
                onChange={(e) =>
                  update('testimonials', data.testimonials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                className={cn(inputCls, 'mt-0')}
                placeholder="Nombre"
              />
              <MediaField
                label="Foto del testimonio"
                accept="image/*"
                value={(ti as LandingTestimonial).photo || ''}
                onChange={(url) => update('testimonials', data.testimonials.map((x, j) => (j === i ? { ...x, photo: url } : x)))}
              />
            </div>
          ))}
        </Card>

        <Card title="Contacto">
          <Field label="WhatsApp (URL wa.me)" value={data.brand.contact.whatsapp} onChange={(v) => updateBrand('contact', { ...data.brand.contact, whatsapp: v })} />
          <Field label="Email" value={data.brand.contact.email} onChange={(v) => updateBrand('contact', { ...data.brand.contact, email: v })} />
          <Field label="Ciudad" value={data.brand.contact.city} onChange={(v) => updateBrand('contact', { ...data.brand.contact, city: v })} />
          {data.brand.contact.socialLinks.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.label}
                onChange={(e) =>
                  updateBrand('contact', { ...data.brand.contact, socialLinks: data.brand.contact.socialLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
                }
                className={cn(inputCls, 'w-32 mt-0')}
                placeholder="Instagram"
              />
              <input
                value={s.href}
                onChange={(e) =>
                  updateBrand('contact', { ...data.brand.contact, socialLinks: data.brand.contact.socialLinks.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })
                }
                className={cn(inputCls, 'mt-0')}
                placeholder="https://instagram.com/..."
              />
            </div>
          ))}
        </Card>

        <Card title="Títulos de secciones">
          <Field label="Tienda" value={data.tienda.title} onChange={(v) => update('tienda', { ...data.tienda, title: v })} />
          <Field label="Subtítulo tienda" value={data.tienda.copy} onChange={(v) => update('tienda', { ...data.tienda, copy: v })} />
          <Field label="Blog" value={data.blog.title} onChange={(v) => update('blog', { ...data.blog, title: v })} />
          <Field label="Subtítulo blog" value={data.blog.subtitle} onChange={(v) => update('blog', { ...data.blog, subtitle: v })} />
          <Field label="Planes" value={data.plans.title} onChange={(v) => update('plans', { ...data.plans, title: v })} />
          <Field label="Subtítulo planes" value={data.plans.subtitle} onChange={(v) => update('plans', { ...data.plans, subtitle: v })} />
          <Field label="Asesoría" value={data.asesoria.title} onChange={(v) => update('asesoria', { ...data.asesoria, title: v })} />
          <Field label="Subtítulo asesoría" value={data.asesoria.subtitle} onChange={(v) => update('asesoria', { ...data.asesoria, subtitle: v })} />
        </Card>
      </div>

      {/* Preview modal — renders the real public landing with the draft */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-2 backdrop-blur">
              <span className="text-sm text-white/60">Vista previa — no publicado</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
              >
                <X size={14} /> Cerrar
              </button>
            </div>
            <div className="h-[calc(100vh-45px)] overflow-y-auto">
              <LandingPage previewData={data} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

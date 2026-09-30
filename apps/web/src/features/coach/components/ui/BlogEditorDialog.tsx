import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BlogPost } from '@/features/coach/types'
import { X, Type, Image as ImageIcon, Globe, Clock, Tag, Eye, Save, Loader2, Monitor, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import RichTextEditor from '@/components/editor/RichTextEditor'

interface BlogEditorDialogProps {
  open: boolean
  initial?: BlogPost | null
  onOpenChange: (open: boolean) => void
  onSave: (p: BlogPost) => void
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'articulo-sin-titulo'
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    gray: 'bg-white/5 text-white/60 border-white/10',
  }
  return (
    <div className={cn('rounded-xl p-3 border', colors[color as keyof typeof colors] || colors.gray)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</span>
        {icon}
      </div>
      <p className="text-lg font-bold font-display">{value}</p>
    </div>
  )
}

function ArticlePreview({ 
  title, excerpt, content, category, tags, imageUrl, isPublished, readTime, slug, isMobile 
}: {
  title: string
  excerpt: string
  content: string
  category: string
  tags: string
  imageUrl: string
  isPublished: boolean
  readTime: number
  slug: string
  isMobile: boolean
}) {
  return (
    <article className={cn('rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden', isMobile && 'max-w-xs mx-auto')}>
      {imageUrl && (
        <div className="h-32 w-full">
          <img src={imageUrl} alt="Portada" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {category && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/20 text-brand-primary">{category}</span>}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/60">{isPublished ? 'Publicado' : 'Borrador'}</span>
        </div>
        <h2 className="text-lg font-semibold text-white line-clamp-2">{title || 'Título del artículo'}</h2>
        <p className="text-sm text-white/60 line-clamp-3">{excerpt.replace(/<[^>]*>/g, '').trim() || 'Escribe un extracto...'}</p>
        <div className="flex items-center gap-3 text-[11px] text-white/40 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1"><Clock size={12} /> {readTime} min</span>
          <span className="flex items-center gap-1"><Tag size={12} /> {tags.split(',').map(t => t.trim()).filter(Boolean).length} tags</span>
        </div>
        <div className="text-[10px] text-white/30 font-mono truncate">/{slug}</div>
      </div>
    </article>
  )
}

export function BlogEditorDialog({ open, initial, onOpenChange, onSave }: BlogEditorDialogProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '')
  const [content, setContent] = useState(initial?.content || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '')
  const [isPublished, setIsPublished] = useState(initial?.isPublished || false)
  const [saving, setSaving] = useState(false)
  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setExcerpt(initial.excerpt)
      setContent(initial.content)
      setCategory(initial.category)
      setTags(initial.tags?.join(', ') || '')
      setImageUrl(initial.imageUrl || '')
      setIsPublished(initial.isPublished)
    } else {
      setTitle('')
      setExcerpt('')
      setContent('')
      setCategory('')
      setTags('')
      setImageUrl('')
      setIsPublished(false)
    }
  }, [initial])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    
    setSaving(true)
    try {
      const id = initial?.id || `post_${Date.now()}`
      const slug = generateSlug(title)
      const now = new Date().toISOString()
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const readTime = calculateReadTime(content)

      onSave({
        id,
        slug,
        title,
        excerpt,
        content,
        category,
        tags: tagList,
        imageUrl,
        isPublished,
        publishedAt: isPublished ? (initial?.publishedAt || now) : null,
        coachId: initial?.coachId || 'default',
        createdAt: initial?.createdAt || now,
        updatedAt: now,
        readTimeMinutes: readTime,
        views: initial?.views || 0,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const previewAvailable = title.trim() && content.trim()

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl h-[90vh] max-h-[90vh] rounded-3xl border border-white/10 bg-surface-1 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
                  <Type size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{initial ? 'Editar artículo' : 'Nuevo artículo'}</h3>
                  <p className="text-[11px] text-white/40">{initial ? 'Modifica los campos y guarda los cambios' : 'Crea un nuevo artículo para tu blog'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              {/* Right: Preview Panel (sticky) */}
              <div className="lg:order-first hidden lg:block">
                <div className="sticky top-6 space-y-4">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ImageIcon size={16} className="text-brand-primary" />
                        Vista previa
                      </h4>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewTab('desktop')}
                          className={cn('p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors', previewTab === 'desktop' && 'bg-white/10 text-white')}
                          aria-label="Vista escritorio"
                        >
                          <Monitor size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('mobile')}
                          className={cn('p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors', previewTab === 'mobile' && 'bg-white/10 text-white')}
                          aria-label="Vista móvil"
                        >
                          <Smartphone size={14} />
                        </button>
                      </div>
                    </div>
                    <div className={cn('p-4', previewTab === 'mobile' && 'max-w-xs mx-auto')}>
                      <ArticlePreview 
                        title={title} 
                        excerpt={excerpt} 
                        content={content} 
                        category={category}
                        tags={tags}
                        imageUrl={imageUrl}
                        isPublished={isPublished}
                        readTime={calculateReadTime(content)}
                        slug={generateSlug(title)}
                        isMobile={previewTab === 'mobile'}
                      />
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<Globe size={14} />} label="Estado" value={isPublished ? 'Publicado' : 'Borrador'} color={isPublished ? 'emerald' : 'amber'} />
                    <StatCard icon={<Clock size={14} />} label="Lectura" value={`${calculateReadTime(content)} min`} color="blue" />
                    <StatCard icon={<Tag size={14} />} label="Tags" value={tags.split(',').map(t => t.trim()).filter(Boolean).length} color="purple" />
                    <StatCard icon={<Eye size={14} />} label="Vistas" value={initial?.views || 0} color="gray" />
                  </div>
                </div>
              </div>

              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-5 min-w-0">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Título del artículo *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Escribe un título atractivo..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                    maxLength={120}
                  />
                  <p className="text-[11px] text-white/30 mt-1 text-right">{title.length}/120</p>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Extracto</label>
                  <RichTextEditor
                    value={excerpt}
                    onChange={(html) => setExcerpt(html)}
                    placeholder="Resumen breve que aparece en listados y SEO..."
                    disabled={false}
                    label="Extracto del artículo"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Contenido completo *</label>
                  <RichTextEditor
                    value={content}
                    onChange={(html) => setContent(html)}
                    placeholder="Escribe el contenido completo del artículo..."
                    disabled={false}
                    label="Contenido del artículo"
                  />
                  <p className="text-[11px] text-white/30 mt-1 text-right">{calculateReadTime(content)} min de lectura · {stripHtml(content).split(/\s+/).length} palabras</p>
                </div>

                {/* Category + Tags */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">Categoría</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="ej. Nutrición, Entrenamiento, Mentalidad"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1.5">Tags</label>
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="separados por coma: nutrición, fuerza, recuperación"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Image URL with Preview */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Imagen de portada (URL)</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors pr-12"
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Eliminar imagen"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                      <img 
                        src={imageUrl} 
                        alt="Portada" 
                        className="w-full h-32 object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>

                {/* Publish toggle */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="relative w-11 h-6">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="peer w-full h-full appearance-none rounded-full border border-white/20 bg-white/5 cursor-pointer transition-colors
                        peer-checked:bg-brand-primary peer-checked:border-brand-primary
                        peer-focus:ring-2 peer-focus:ring-brand-primary/20 peer-focus:outline-none"
                    />
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-full peer-checked:shadow-md" />
                  </div>
                  <div>
                    <label htmlFor="isPublished" className="text-sm font-medium text-white cursor-pointer">Publicar artículo</label>
                    <p className="text-[11px] text-white/40 mt-0.5">Aparecerá públicamente en tu blog inmediatamente</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!previewAvailable || saving}
                className={cn(
                  'rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-all',
                  previewAvailable
                    ? 'bg-brand-primary hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/25'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : initial ? (
                  <>
                    <Save size={16} className="mr-2" />
                    Actualizar artículo
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Crear artículo
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
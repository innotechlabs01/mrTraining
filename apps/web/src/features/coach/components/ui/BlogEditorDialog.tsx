import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { BlogPost } from '@/features/coach/types'
import { X, Type, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export function BlogEditorDialog({ open, initial, onOpenChange, onSave }: BlogEditorDialogProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '')
  const [content, setContent] = useState(initial?.content || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '')
  const [isPublished, setIsPublished] = useState(initial?.isPublished || false)

  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setExcerpt(initial.excerpt)
      setContent(initial.content)
      setCategory(initial.category)
      setTags(initial.tags?.join(', ') || '')
      setImageUrl(initial.imageUrl || '')
      setIsPublished(initial.isPublished)
    }
  }, [initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
  }

  const previewAvailable = title && content && excerpt

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl rounded-2xl border border-white/10 bg-surface-1 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
              <Type size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {initial ? 'Editar artículo' : 'Nuevo artículo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Preview */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white/80 mb-3">
                <ImageIcon size={16} className="text-brand-primary" />
                Vista previa
              </h4>
              <div className="text-xs text-white/40 space-y-1">
                <p>Slug: {generateSlug(title)}</p>
                <p>Lectura: {calculateReadTime(content)} min</p>
                <p>Estado: {isPublished ? 'Publicado' : 'Borrador'}</p>
                <p>Tags: {tags.split(',').map((t) => t.trim()).filter(Boolean).length}</p>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Título *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del artículo..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Extracto</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Resumen breve del artículo..."
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none resize-y"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Contenido *</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el contenido completo del artículo..."
                rows={12}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none resize-y font-mono"
              />
            </div>

            {/* Category + Tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Categoría</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="ej. Nutrición, Training, Mindset"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Tags</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="separados por coma"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Imagen (URL)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary"
              />
              <label htmlFor="isPublished" className="text-sm text-white/70 cursor-pointer">
                Publicar artículo
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!previewAvailable}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors',
              previewAvailable
                ? 'bg-brand-primary hover:bg-brand-primary/90'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            )}
          >
            {initial ? 'Actualizar' : 'Crear artículo'}
          </button>
        </div>
      </motion.form>
    </div>
  )
}

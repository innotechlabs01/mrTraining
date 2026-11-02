'use client'

import { useState } from 'react'
import { useBlogPosts } from '@/features/coach/hooks/useBlogPosts'
import { BlogEditorDialog } from '@/features/coach/components/ui/BlogEditorDialog'
import type { BlogPost } from '@/features/coach/types'
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BarChart3,
  Globe,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

function DashboardCard({
  index = 0,
  className,
  children,
}: {
  index?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/5 bg-surface-1 p-5 transition-colors hover:border-white/10',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

export default function BlogPage() {
  const { posts, hydrated, addPost, updatePost, removePost } = useBlogPosts()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [search, setSearch] = useState('')

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  const publishedCount = posts.filter((p) => p.isPublished).length
  const draftCount = posts.filter((p) => !p.isPublished).length
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0)

  const handleSave = (p: BlogPost) => {
    if (editing) {
      updatePost(editing.id, p)
      toast.success(`Artículo "${p.title}" actualizado`)
    } else {
      addPost(p)
      toast.success(`Artículo "${p.title}" creado`)
    }
    setEditing(null)
  }

  const handleEdit = (p: BlogPost) => {
    setEditing(p)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const p = posts.find((p) => p.id === id)
    removePost(id)
    if (p) toast.success(`Artículo "${p.title}" eliminado`)
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Blog</h1>
          <p className="text-white/50 text-sm">Gestiona tus artículos y publica contenido para tu comunidad.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          <Plus size={16} />
          Nuevo artículo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardCard index={0} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Publicados</p>
              <p className="text-2xl font-bold font-display text-white">{publishedCount}</p>
            </div>
            <div className="shrink-0 rounded-xl p-2.5 bg-emerald-500/20 text-emerald-400">
              <Globe size={18} />
            </div>
          </div>
        </DashboardCard>
        <DashboardCard index={1} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Borradores</p>
              <p className="text-2xl font-bold font-display text-white">{draftCount}</p>
            </div>
            <div className="shrink-0 rounded-xl p-2.5 bg-amber-500/20 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
        </DashboardCard>
        <DashboardCard index={2} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Vistas totales</p>
              <p className="text-2xl font-bold font-display text-white tabular-nums">{totalViews}</p>
            </div>
            <div className="shrink-0 rounded-xl p-2.5 bg-blue-500/20 text-blue-400">
              <BarChart3 size={18} />
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard index={0} className="p-0">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 size-4" />
            <input
              placeholder="Buscar por título o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <Filter className="text-white/40 size-4" />
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-white/50">
            <Book className="mb-3 size-12 text-white/20" />
            <p className="text-sm">Sin artículos registrados.</p>
            <p className="text-[11px] mt-1">Haz clic en &quot;Nuevo artículo&quot; para empezar.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                <div className="hidden sm:block shrink-0 w-16 h-12 rounded-lg bg-surface-3 overflow-hidden">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Book size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{p.title}</p>
                    {p.isPublished ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                        <Globe size={8} /> Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400">
                        Borrador
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 truncate">{p.category} · {p.readTimeMinutes} min read · {p.views} vistas</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-1.5 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/15 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </DashboardCard>

      <BlogEditorDialog
        open={dialogOpen}
        initial={editing}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditing(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}

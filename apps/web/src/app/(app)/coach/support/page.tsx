'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Ticket as TicketIcon,
  CircleDot,
  CheckCircle2,
  Image as ImageIcon,
  Send,
  CheckCheck,
  RotateCcw,
  X,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTickets } from '@/features/coach/hooks/useTickets'
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/features/coach/types'

const CATEGORY: Record<TicketCategory, { label: string; className: string }> = {
  problem: { label: 'Problema', className: 'bg-red-500/15 text-red-400' },
  question: { label: 'Pregunta', className: 'bg-blue-500/15 text-blue-400' },
  feedback: { label: 'Sugerencia', className: 'bg-purple-500/15 text-purple-400' },
}

const PRIORITY: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'bg-white/10 text-white/50' },
  medium: { label: 'Media', className: 'bg-amber-500/15 text-amber-400' },
  high: { label: 'Alta', className: 'bg-red-500/20 text-red-400' },
}

const STATUS: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'Abierto', className: 'bg-emerald-500/15 text-emerald-400' },
  resolved: { label: 'Resuelto', className: 'bg-white/10 text-white/50' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CoachSupportPage() {
  const { tickets, createTicket, addMessage, resolveTicket, reopenTicket } = useTickets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')
  const [composing, setComposing] = useState(false)

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).reverse(),
    [tickets],
  )
  const visible = sorted.filter((t) => (filter === 'all' ? true : t.status === filter))

  const selected = tickets.find((t) => t.id === selectedId) ?? visible[0] ?? null

  useEffect(() => {
    if (!selectedId && visible[0]) setSelectedId(visible[0].id)
  }, [visible, selectedId])

  const openCount = tickets.filter((t) => t.status === 'open').length
  const nextNum = Math.max(0, ...tickets.map((t) => t.number)) + 1

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-display font-bold text-white">
            <TicketIcon size={20} className="text-brand-primary" /> Centro de Soporte
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {openCount > 0
              ? `${openCount} ticket${openCount > 1 ? 's' : ''} abierto${openCount > 1 ? 's' : ''} · controla y resuelve incidencias`
              : 'No tienes tickets abiertos · todo en orden'}
          </p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          <Plus size={16} /> Nuevo ticket
          <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs tabular-nums">#{nextNum}</span>
        </button>
      </div>

      <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Ticket list */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-white/5 bg-surface-1">
          <div className="flex gap-1 border-b border-white/5 p-2">
            {(['all', 'open', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70',
                )}
              >
                {f === 'all' ? 'Todos' : f === 'open' ? 'Abiertos' : 'Resueltos'}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {visible.length === 0 && (
              <p className="p-4 text-center text-xs text-white/30">Sin tickets aquí.</p>
            )}
            {visible.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  selected?.id === t.id
                    ? 'border-brand-primary/40 bg-brand-primary/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white/50 tabular-nums">#{t.number}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS[t.status].className)}>
                    {STATUS[t.status].label}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-white/90">{t.subject}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
                  <span className={cn('rounded px-1.5 py-0.5', CATEGORY[t.category].className)}>
                    {CATEGORY[t.category].label}
                  </span>
                  <span>· {fmtDate(t.createdAt)}</span>
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket detail */}
        <div className="min-h-0 overflow-hidden rounded-2xl border border-white/5 bg-surface-1">
          {selected ? (
            <TicketDetail
              key={selected.id}
              ticket={selected}
              onResolve={() => resolveTicket(selected.id)}
              onReopen={() => reopenTicket(selected.id)}
                onReply={(body, imageUrl) => addMessage(selected.id, 'coach', body, imageUrl)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Selecciona o crea un ticket
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {composing && (
          <NewTicketModal
            nextNumber={nextNum}
            onClose={() => setComposing(false)}
            onCreate={(input) => {
              const t = createTicket(input)
              setSelectedId(t.id)
              setComposing(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TicketDetail({
  ticket,
  onResolve,
  onReopen,
  onReply,
}: {
  ticket: SupportTicket
  onResolve: () => void
  onReopen: () => void
  onReply: (body: string, imageUrl?: string) => void
}) {
  const [reply, setReply] = useState('')
  const [img, setImg] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [ticket.messages.length])

  const send = () => {
    if (!reply.trim() && !img) return
    onReply(reply.trim() || 'Imagen adjunta', img)
    setReply('')
    setImg(undefined)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/50 tabular-nums">#{ticket.number}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS[ticket.status].className)}>
              {STATUS[ticket.status].label}
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', CATEGORY[ticket.category].className)}>
              {CATEGORY[ticket.category].label}
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY[ticket.priority].className)}>
              Prioridad {PRIORITY[ticket.priority].label}
            </span>
          </div>
          <h2 className="mt-1.5 truncate text-base font-semibold text-white">{ticket.subject}</h2>
          <p className="text-[11px] text-white/40">Creado {fmtDate(ticket.createdAt)}</p>
        </div>
        {ticket.status === 'open' ? (
          <button
            onClick={onResolve}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
          >
            <CheckCheck size={15} /> Marcar resuelto
          </button>
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Resuelto {ticket.resolvedAt ? fmtDate(ticket.resolvedAt) : ''}
            </span>
            <button
              onClick={onReopen}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              <RotateCcw size={13} /> Reabrir
            </button>
          </div>
        )}
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.author === 'coach' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl border p-3',
                m.author === 'coach'
                  ? 'border-brand-primary/30 bg-brand-primary/10'
                  : 'border-white/5 bg-white/[0.03]',
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                {m.author === 'coach' ? (
                  <span className="text-brand-primary/90">Tú</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CircleDot size={11} /> Soporte
                  </span>
                )}
                <span className="text-white/30">· {fmtDate(m.createdAt)}</span>
              </div>
              {m.body && <p className="whitespace-pre-wrap text-sm text-white/85">{m.body}</p>}
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt="Adjunto"
                  className="mt-2 max-h-48 rounded-lg border border-white/10 object-cover"
                />
              )}
            </div>
          </div>
        ))}
        {ticket.status === 'resolved' && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-xs text-emerald-400/90">
            <CheckCircle2 size={14} /> Este ticket está cerrado.
          </div>
        )}
      </div>

      {/* Reply box (only while open) */}
      {ticket.status === 'open' && (
        <div className="border-t border-white/5 p-3">
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-white/60 transition-colors hover:bg-white/5"
              title="Adjuntar imagen"
            >
              <ImageIcon size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 1_500_000) {
                  alert('Imagen muy pesada (máx 1.5 MB). Usa una captura más ligera.')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => setImg(reader.result as string)
                reader.readAsDataURL(file)
              }}
            />
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Escribe un mensaje o adjunta el hallazgo…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-surface-0 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-brand-primary/50 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!reply.trim() && !img}
              className="shrink-0 rounded-xl bg-brand-primary p-2.5 text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
          {img && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="preview" className="h-12 w-12 rounded object-cover" />
              <span className="flex-1 truncate text-xs text-white/50">Imagen lista para enviar</span>
              <button onClick={() => setImg(undefined)} className="text-white/40 hover:text-white">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewTicketModal({
  nextNumber,
  onClose,
  onCreate,
}: {
  nextNumber: number
  onClose: () => void
  onCreate: (input: {
    subject: string
    category: TicketCategory
    priority: TicketPriority
    body: string
    imageUrl?: string
  }) => void
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<TicketCategory>('problem')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [img, setImg] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    if (!subject.trim() || !body.trim()) return
    onCreate({ subject: subject.trim(), body: body.trim(), category, priority, imageUrl: img })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-surface-1"
      >
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <TicketIcon size={16} className="text-brand-primary" /> Nuevo ticket
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-white/60 tabular-nums">#{nextNumber}</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">Asunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resume el problema o duda"
              className="w-full rounded-xl border border-white/10 bg-surface-0 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-brand-primary/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Tipo</label>
              <div className="flex gap-1">
                {(Object.keys(CATEGORY) as TicketCategory[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      category === c ? CATEGORY[c].className : 'bg-white/5 text-white/40 hover:text-white/70',
                    )}
                  >
                    {CATEGORY[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Prioridad</label>
              <div className="flex gap-1">
                {(Object.keys(PRIORITY) as TicketPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      priority === p ? PRIORITY[p].className : 'bg-white/5 text-white/40 hover:text-white/70',
                    )}
                  >
                    {PRIORITY[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              Detalle del hallazgo
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Describe lo que encontraste, pasos para reproducirlo o tu sugerencia…"
              className="w-full resize-none rounded-xl border border-white/10 bg-surface-0 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-brand-primary/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/5"
            >
              <ImageIcon size={15} /> Adjuntar imagen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 1_500_000) {
                  alert('Imagen muy pesada (máx 1.5 MB).')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => setImg(reader.result as string)
                reader.readAsDataURL(file)
              }}
            />
            {img && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="preview" className="h-9 w-9 rounded object-cover" />
                <button onClick={() => setImg(undefined)} className="text-white/40 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-white/30">
              <AlertCircle size={12} /> Opcional
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/5 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!subject.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-40"
          >
            <MessageSquare size={15} /> Crear ticket #{nextNumber}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

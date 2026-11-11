'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TicketCheck, Plus, Filter, Search, ChevronRight, ChevronLeft,
  MessageSquare, Send, Image, X, CheckCheck, RotateCcw, AlertCircle,
  CircleDot, CheckCircle2, MoreVertical, Flag, Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  messages: Message[];
}

interface Message {
  id: string;
  ticket_id: string;
  author: 'coach' | 'support';
  body: string;
  image_url?: string;
  created_at: string;
}

const CATEGORY: Record<string, { label: string; className: string }> = {
  problem: { label: 'Problema', className: 'bg-error/15 text-error' },
  question: { label: 'Pregunta', className: 'bg-blue-500/15 text-blue-400' },
  feature: { label: 'Función', className: 'bg-success/15 text-success' },
  billing: { label: 'Facturación', className: 'bg-warning/15 text-warning' },
  technical: { label: 'Técnico', className: 'bg-surface-4 text-text-secondary' },
  other: { label: 'Otro', className: 'bg-surface-4 text-text-secondary' },
};

const PRIORITY: Record<string, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'bg-surface-4 text-text-secondary' },
  medium: { label: 'Media', className: 'bg-warning/15 text-warning' },
  high: { label: 'Alta', className: 'bg-error/20 text-error' },
  urgent: { label: 'Urgente', className: 'bg-error/20 text-error animate-pulse' },
};

const STATUS: Record<string, { label: string; className: string }> = {
  open: { label: 'Abierto', className: 'bg-success/15 text-success' },
  in_progress: { label: 'En progreso', className: 'bg-blue-500/15 text-blue-400' },
  resolved: { label: 'Resuelto', className: 'bg-surface-4 text-text-secondary' },
  closed: { label: 'Cerrado', className: 'bg-surface-4 text-text-tertiary' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTicketsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState('');
  const [img, setImg] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const isSuperAdmin = user?.id && superAdminIds.includes(user.id);

  useEffect(() => {
    if (isLoaded && user) {
      if (!isSuperAdmin) {
        router.push('/coach');
        return;
      }
      loadTickets();
    }
  }, [user, isSuperAdmin, router]);

  const isLoaded = !!user;

  async function loadTickets() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [tickets]
  );
  const visible = sorted.filter((t) =>
    (filter === 'all' ? true : t.status === filter) &&
    (search ? t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.coach_name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const selected = tickets.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (!selectedId && visible[0]) setSelectedId(visible[0].id);
  }, [visible, selectedId]);

  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const nextNum = Math.max(0, ...tickets.map((t) => t.ticket_number)) + 1;

  const addMessage = useCallback(async (body: string, imageUrl?: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, image_url: imageUrl }),
      });
      if (res.ok) {
        setReply('');
        setImg(undefined);
        loadTickets();
      }
    } catch (err) {
      console.error('Failed to add message:', err);
    }
  }, [selected, loadTickets]);

  const resolveTicket = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets/${ticketId}/resolve`, {
        method: 'POST',
      });
      if (res.ok) {
        loadTickets();
      }
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
    }
  }, [loadTickets]);

  const reopenTicket = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets/${ticketId}/reopen`, {
        method: 'POST',
      });
      if (res.ok) {
        loadTickets();
      }
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    }
  }, [loadTickets]);

  const markAsRead = useCallback(async () => {
    if (!selected) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets/${selected.id}/read`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [selected]);

  const send = () => {
    if (!reply.trim() && !img) return;
    addMessage(reply.trim() || 'Imagen adjunta', img);
    setReply('');
    setImg(undefined);
  };

  const createTicket = useCallback(async (input: {
    subject: string;
    category: string;
    priority: string;
    body: string;
    image_url?: string;
  }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        loadTickets();
        return data.id;
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  }, [loadTickets]);

  if (!user) return null;
  if (!isSuperAdmin) return <div className="p-6">Acceso denegado</div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tickets / Soporte</h1>
          <p className="text-text-secondary mt-1">Gestión de tickets de coaches</p>
        </div>
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-text-inverse text-sm font-medium hover:bg-brand-primary/90"
          >
            <Plus size={16} /> Nuevo Ticket
          </button>
        </div>
      </div>

      <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Ticket List */}
        <div className="flex min-h-0 flex-col rounded-lg border border-surface-6 bg-surface-1">
          <div className="flex gap-1 border-b border-surface-6 p-2">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  filter === f ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'text-text-secondary hover:text-text-inverse hover:bg-surface-2'
                )}
              >
                {f === 'all' ? 'Todos' : f === 'open' ? 'Abiertos' : f === 'in_progress' ? 'En Progreso' : 'Resueltos'}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {visible.length === 0 && (
              <p className="p-4 text-center text-xs text-text-secondary">Sin tickets aquí.</p>
            )}
            {visible.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  selected?.id === t.id
                    ? 'border-brand-primary/40 bg-brand-primary/5'
                    : 'border-surface-6 bg-surface-1 hover:border-surface-3'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-secondary tabular-nums">#{t.ticket_number}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS[t.status]?.className || 'bg-surface-2 text-text-secondary')}>
                    {STATUS[t.status]?.label || t.status}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-text-primary">{t.subject}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <span className={cn('rounded px-1.5 py-0.5', CATEGORY[t.category]?.className || 'bg-surface-2 text-text-secondary')}>
                    {CATEGORY[t.category]?.label || t.category}
                  </span>
                  <span>· {fmtDate(t.created_at)}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY[t.priority]?.className || 'bg-surface-2 text-text-secondary')}>
                    {PRIORITY[t.priority]?.label || t.priority}
                  </span>
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="min-h-0 overflow-hidden rounded-lg border border-surface-6 bg-surface-1">
          {selected ? (
            <TicketDetail
              key={selected.id}
              ticket={selected}
              onResolve={() => resolveTicket(selected.id)}
              onReopen={() => reopenTicket(selected.id)}
              onReply={addMessage}
              reply={reply}
              setReply={setReply}
              img={img}
              setImg={setImg}
              send={send}
              scrollRef={scrollRef}
              fileRef={fileRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              Selecciona o crea un ticket
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {composing && (
          <NewTicketModal
            nextNumber={nextNum}
            onClose={() => setComposing(false)}
            onCreate={async (input) => {
              const ticketId = await createTicket(input);
              if (ticketId) {
                setSelectedId(ticketId);
                setComposing(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TicketDetail({
  ticket,
  onResolve,
  onReopen,
  onReply,
  reply,
  setReply,
  img,
  setImg,
  send,
  scrollRef,
  fileRef,
}: {
  ticket: Ticket;
  onResolve: () => void;
  onReopen: () => void;
  onReply: (body: string, imageUrl?: string) => void;
  reply: string;
  setReply: (v: string) => void;
  img: string | undefined;
  setImg: (v: string | undefined) => void;
  send: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  fileRef: React.RefObject<HTMLInputElement>;
}) {
  const { data: messages = [] } = useTicketMessages(ticket.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-surface-6 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-secondary tabular-nums">#{ticket.ticket_number}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS[ticket.status]?.className)}>
              {STATUS[ticket.status]?.label}
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', CATEGORY[ticket.category]?.className)}>
              {CATEGORY[ticket.category]?.label}
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY[ticket.priority]?.className)}>
              Prioridad {PRIORITY[ticket.priority]?.label}
            </span>
          </div>
          <h2 className="mt-1.5 truncate text-base font-semibold text-text-primary">{ticket.subject}</h2>
          <p className="text-[11px] text-text-secondary">Creado {fmtDate(ticket.created_at)} · Coach: {ticket.coach_name} ({ticket.coach_email})</p>
        </div>
        {ticket.status === 'open' ? (
          <button
            onClick={onResolve}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/25"
          >
            <CheckCheck size={15} /> Marcar resuelto
          </button>
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
              <CheckCircle2 size={13} className="text-success" />
              Resuelto {ticket.resolved_at ? fmtDate(ticket.resolved_at) : ''}
            </span>
            <button
              onClick={onReopen}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 border border-surface-6 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-3"
            >
              <RotateCcw size={13} /> Reabrir
            </button>
          </div>
        )}
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.author === 'support' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg border p-3',
                m.author === 'support'
                  ? 'border-brand-primary/30 bg-brand-primary/10'
                  : 'border-surface-6 bg-surface-1'
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                {m.author === 'support' ? (
                  <span className="text-brand-primary/90">Soporte (Admin)</span>
                ) : (
                  <span className="flex items-center gap-1 text-success">
                    <CircleDot size={11} /> Coach
                  </span>
                )}
                <span className="text-text-secondary">· {fmtDate(m.created_at)}</span>
              </div>
              {m.body && <p className="whitespace-pre-wrap text-sm text-text-primary">{m.body}</p>}
              {m.image_url && (
                <img
                  src={m.image_url}
                  alt="Adjunto"
                  className="mt-2 max-h-48 rounded-lg border border-surface-6 object-cover"
                />
              )}
            </div>
          </div>
        ))}
        {ticket.status === 'resolved' && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/5 py-2 text-xs text-success/90">
            <CheckCircle2 size={14} /> Este ticket está cerrado.
          </div>
        )}
      </div>

      {/* Reply box */}
      {ticket.status === 'open' && (
        <div className="border-t border-surface-6 p-3">
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 rounded-xl border border-surface-6 bg-surface-1 p-2.5 text-text-secondary transition-colors hover:bg-surface-2"
              title="Adjuntar imagen"
            >
              <Image size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1_500_000) {
                  alert('Imagen muy pesada (máx 1.5 MB). Usa una captura más ligera.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setImg(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Escribe una respuesta o adjunta el hallazgo…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-surface-6 bg-surface-0 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!reply.trim() && !img}
              className="shrink-0 rounded-xl bg-brand-primary p-2.5 text-text-inverse transition-colors hover:bg-brand-primary-hover disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
          {img && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-surface-6 bg-surface-1 p-2">
              <img src={img} alt="preview" className="h-12 w-12 rounded object-cover" />
              <span className="flex-1 truncate text-xs text-text-secondary">Imagen lista para enviar</span>
              <button onClick={() => setImg(undefined)} className="text-text-secondary hover:text-text-primary">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewTicketModal({
  nextNumber,
  onClose,
  onCreate,
}: {
  nextNumber: number;
  onClose: () => void;
  onCreate: (input: {
    subject: string;
    category: string;
    priority: string;
    body: string;
    imageUrl?: string;
  }) => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('problem');
  const [priority, setPriority] = useState('medium');
  const [img, setImg] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!subject.trim() || !body.trim()) return;
    onCreate({ subject: subject.trim(), body: body.trim(), category, priority, imageUrl: img });
  };

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
        className="w-full max-w-lg overflow-hidden rounded-lg border border-surface-6 bg-surface-1"
      >
        <div className="flex items-center justify-between border-b border-surface-6 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TicketCheck size={16} className="text-brand-primary" /> Nuevo ticket
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-text-secondary tabular-nums">#{nextNumber}</span>
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Asunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resume el problema o duda"
              className="w-full rounded-xl border border-surface-6 bg-surface-0 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo</label>
              <div className="flex gap-1">
                {(Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      category === c ? CATEGORY[c].className : 'bg-surface-1 border border-surface-6 text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {CATEGORY[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Prioridad</label>
              <div className="flex gap-1">
                {(Object.keys(PRIORITY) as (keyof typeof PRIORITY)[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      priority === p ? PRIORITY[p].className : 'bg-surface-1 border border-surface-6 text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {PRIORITY[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Detalle del hallazgo
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Describe lo que encontraste, pasos para reproducirlo o tu sugerencia…"
              className="w-full resize-none rounded-xl border border-surface-6 bg-surface-0 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-6 bg-surface-1 py-2 text-xs font-medium text-brand-primary transition-colors hover:bg-surface-2"
            >
              <Image size={15} /> Adjuntar imagen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1_500_000) {
                  alert('Imagen muy pesada (máx 1.5 MB).');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setImg(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            {img && (
              <div className="flex items-center gap-2 rounded-lg border border-surface-6 bg-surface-1 p-1.5">
                <img src={img} alt="preview" className="h-9 w-9 rounded object-cover" />
                <button onClick={() => setImg(undefined)} className="text-text-secondary hover:text-text-primary">
                  <X size={14} />
                </button>
              </div>
            )}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-text-secondary">
              <AlertCircle size={12} /> Opcional
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-6 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-surface-6 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!subject.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-primary-hover disabled:opacity-40"
          >
            <MessageSquare size={15} /> Crear ticket #{nextNumber}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hook for ticket messages
function useTicketMessages(ticketId: string) {
  const [data, setData] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/admin/tickets/${ticketId}/messages`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!cancelled) setData(Array.isArray(data) ? data : (data.data || []));
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  return { data, loading };
}
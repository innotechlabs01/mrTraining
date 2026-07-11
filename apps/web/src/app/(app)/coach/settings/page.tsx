'use client'

import { useState, useEffect } from 'react'
import { User, Bell, CreditCard, SlidersHorizontal, Globe, Save, Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePublicPageConfig } from '@/features/coach/hooks/usePublicPageConfig'
import { usePaymentMethods } from '@/features/coach/hooks/usePaymentMethods'
import { isPaymentMethodComplete } from '@/features/coach/types'
import type { PublicPageConfig, PaymentMethod, AccountType } from '@/features/coach/types'

type TabId = 'perfil' | 'notificaciones' | 'facturacion' | 'preferencias' | 'publica'

const TABS: { id: TabId; label: string; icon: typeof User; desc: string }[] = [
  { id: 'perfil', label: 'Perfil', icon: User, desc: 'Tu información personal' },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell, desc: 'Avisos y alertas' },
  { id: 'facturacion', label: 'Facturación', icon: CreditCard, desc: 'Pagos y suscripción' },
  { id: 'preferencias', label: 'Preferencias', icon: SlidersHorizontal, desc: 'Idioma y zona horaria' },
  { id: 'publica', label: 'Página pública', icon: Globe, desc: 'Personaliza tu link de registro' },
]

const NOTIFICATIONS = [
  { label: 'Nuevos mensajes de atletas', enabled: true },
  { label: 'Alertas de readiness bajos', enabled: true },
  { label: 'Pagos recibidos', enabled: true },
  { label: 'Recordatorio de sesiones', enabled: true },
  { label: 'Reporte semanal', enabled: false },
]

export default function CoachSettingsPage() {
  const [tab, setTab] = useState<TabId>('perfil')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Ajustes</h1>
        <p className="text-sm text-white/40 mt-1">Gestiona tu cuenta, preferencias y tu página pública</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-60 shrink-0 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                  active ? 'bg-surface-2 border border-white/10 text-white' : 'border border-transparent text-white/50 hover:bg-white/[0.03] hover:text-white/80',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-brand-primary' : 'text-white/40')} />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 space-y-4">
          {tab === 'perfil' && <PerfilCard />}
          {tab === 'notificaciones' && <NotificacionesCard />}
          {tab === 'facturacion' && <FacturacionCard />}
          {tab === 'preferencias' && <PreferenciasCard />}
          {tab === 'publica' && <PublicaCard />}
        </div>
      </div>
    </div>
  )
}

function Card({ title, desc, children, footer }: { title: string; desc: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
      {footer && <div className="px-5 py-4 border-t border-white/5 flex justify-end">{footer}</div>}
    </div>
  )
}

const inputClass =
  'w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary transition-colors'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-white/50 mb-1.5">{children}</label>
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)}
      className={cn('w-10 h-6 rounded-full transition-colors relative shrink-0', enabled ? 'bg-brand-primary' : 'bg-white/15')}>
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', enabled ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

function PerfilCard() {
  return (
    <Card title="Información del perfil" desc="Estos datos identifican tu cuenta como coach." footer={<SaveButton />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre</Label>
          <input type="text" defaultValue="Coach" className={inputClass} />
        </div>
        <div>
          <Label>Email</Label>
          <input type="email" defaultValue="coach@mrtraining.app" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <Label>Especialidad</Label>
          <input type="text" defaultValue="Track & Field, Running" className={inputClass} />
        </div>
      </div>
    </Card>
  )
}

function NotificacionesCard() {
  const [items, setItems] = useState(NOTIFICATIONS)
  return (
    <Card title="Notificaciones" desc="Elige qué avisos quieres recibir.">
      <div className="divide-y divide-white/5">
        {items.map((n, i) => (
          <div key={n.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-white/70">{n.label}</span>
            <Toggle enabled={n.enabled} onChange={(v) => setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, enabled: v } : x)))} />
          </div>
        ))}
      </div>
    </Card>
  )
}

function FacturacionCard() {
  const { methods, addMethod, updateMethod, removeMethod } = usePaymentMethods()
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [creating, setCreating] = useState(false)

  const enabledCount = methods.filter(isPaymentMethodComplete).length

  return (
    <Card
      title="Método de pago"
      desc="Único medio habilitado: transferencia bancaria. Tus usuarios te pagan el valor de la membresía por este medio. Se activa al completar los datos."
      footer={
        <button
          onClick={() => {
            setEditing(null)
            setCreating(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-[#04121f] text-sm font-semibold hover:brightness-110 transition"
        >
          <Plus className="w-4 h-4" /> Añadir cuenta
        </button>
      }
    >
      {methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
          Aún no tienes una cuenta bancaria configurada. Agrégala para que tus usuarios puedan pagarte la membresía.
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => {
            const complete = isPaymentMethodComplete(m)
            return (
              <div
                key={m.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3.5 transition',
                  complete ? 'border-white/10 bg-surface-2' : 'border-amber-400/20 bg-amber-500/[0.04]',
                )}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{m.bank || 'Sin banco'}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        complete ? 'bg-brand-primary/15 text-brand-primary' : 'bg-amber-500/15 text-amber-300',
                      )}
                    >
                      {complete ? 'Habilitado' : 'Incompleto'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {m.holder} · {m.accountType === 'savings' ? 'Cuenta de ahorro' : 'Cuenta de cheques'}
                  </p>
                  {m.accountNumber && (
                    <p className="text-xs text-white/40">Nº {m.accountNumber}</p>
                  )}
                  {m.clabe && <p className="text-xs text-white/40">CLABE {m.clabe}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditing(m)
                      setCreating(true)
                    }}
                    className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-brand-primary"
                    aria-label="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeMethod(m.id)}
                    className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-rose-300"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-white/30">
        {enabledCount} cuenta{enabledCount === 1 ? '' : 's'} habilitada{enabledCount === 1 ? '' : 's'}. Tus usuarios solo ven las cuentas completas al pagar su membresía.
      </p>

      {creating && (
        <PaymentMethodModal
          initial={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={(input) => {
            if (editing) updateMethod(editing.id, input)
            else addMethod(input)
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </Card>
  )
}

function PaymentMethodModal({
  initial,
  onClose,
  onSave,
}: {
  initial: PaymentMethod | null
  onClose: () => void
  onSave: (input: {
    bank: string
    holder: string
    accountType: AccountType
    accountNumber: string
    clabe: string
    notes?: string
  }) => void
}) {
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [holder, setHolder] = useState(initial?.holder ?? '')
  const [accountType, setAccountType] = useState<AccountType>(initial?.accountType ?? 'checking')
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '')
  const [clabe, setClabe] = useState(initial?.clabe ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!bank.trim()) return setError('Indica el banco.')
    if (!holder.trim()) return setError('Indica el titular de la cuenta.')
    if (!accountNumber.trim()) return setError('Indica el número de cuenta.')
    if (!clabe.trim()) return setError('Indica la CLABE interbancaria.')
    onSave({
      bank: bank.trim(),
      holder: holder.trim(),
      accountType,
      accountNumber: accountNumber.trim(),
      clabe: clabe.trim(),
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1622] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{initial ? 'Editar cuenta' : 'Nueva cuenta bancaria'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Banco</Label>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej. BBVA, Santander, Banamex" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Titular</Label>
              <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nombre del titular" className={inputClass} />
            </div>
            <div>
              <Label>Tipo de cuenta</Label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={inputClass}>
                <option value="checking" className="bg-[#0b1622]">Cuenta de cheques</option>
                <option value="savings" className="bg-[#0b1622]">Cuenta de ahorro</option>
              </select>
            </div>
            <div>
              <Label>Número de cuenta</Label>
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className={inputClass} />
            </div>
          </div>

          <div>
            <Label>CLABE interbancaria</Label>
            <input value={clabe} onChange={(e) => setClabe(e.target.value)} placeholder="18 dígitos" className={inputClass} />
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Instrucciones adicionales para el pago"
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <p className="text-[11px] text-white/30">
            La cuenta queda <span className="text-amber-300">incompleta</span> hasta llenar banco, titular, nº de cuenta y CLABE. Solo las completas se muestran a tus usuarios.
          </p>

          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-white/60 transition hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-[#04121f] transition hover:brightness-110"
          >
            <Check className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function PreferenciasCard() {
  return (
    <Card title="Preferencias" desc="Configuración regional de la cuenta.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Idioma</span>
          <select className="px-3 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white outline-none focus:border-brand-primary">
            <option>Español</option>
            <option>English</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Zona horaria</span>
          <select className="px-3 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white outline-none focus:border-brand-primary">
            <option>America/Mexico_City (GMT-6)</option>
            <option>America/New_York (GMT-5)</option>
            <option>America/Los_Angeles (GMT-8)</option>
          </select>
        </div>
      </div>
    </Card>
  )
}

function PublicaCard() {
  const { config, save } = usePublicPageConfig()
  const [draft, setDraft] = useState<PublicPageConfig>(config)

  useEffect(() => { setDraft(config) }, [config])

  const update = (patch: Partial<PublicPageConfig>) => setDraft((prev) => ({ ...prev, ...patch }))

  return (
    <Card
      title="Página pública de registro"
      desc="Personaliza el encabezado y pie de la página donde se inscriben los usuarios desde tu link."
      footer={
        <button onClick={() => save(draft)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors">
          <Save className="w-4 h-4" /> Guardar cambios
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <Label>Nombre de marca (encabezado)</Label>
            <input value={draft.brandName} onChange={(e) => update({ brandName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <Label>Eslogan (subtítulo del encabezado)</Label>
            <input value={draft.tagline ?? ''} onChange={(e) => update({ tagline: e.target.value })} placeholder="Entrenamiento de alto rendimiento" className={inputClass} />
          </div>
          <div>
            <Label>Mensaje de bienvenida</Label>
            <textarea value={draft.welcomeMessage ?? ''} onChange={(e) => update({ welcomeMessage: e.target.value })} rows={2}
              placeholder="Opcional: texto que verán al abrir el registro" className={cn(inputClass, 'resize-none')} />
          </div>
          <div>
            <Label>Texto del pie de página</Label>
            <input value={draft.footerText} onChange={(e) => update({ footerText: e.target.value })} className={inputClass} />
          </div>
        </div>

        <div>
          <Label>Vista previa</Label>
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
            <div className="text-center">
              <p className="text-sm font-semibold tracking-[0.2em] text-brand-primary uppercase">{draft.brandName || 'Marca'}</p>
              {draft.tagline && <p className="text-xs text-white/40 mt-1">{draft.tagline}</p>}
            </div>
            <div className="mt-4 rounded-lg bg-surface-1 border border-white/10 p-3">
              <div className="h-3 w-2/3 rounded bg-white/15" />
              <div className="mt-2 h-2 w-full rounded bg-white/10" />
              <div className="mt-1.5 h-2 w-5/6 rounded bg-white/10" />
              {draft.welcomeMessage && (
                <div className="mt-3 rounded bg-surface-2 border border-white/5 px-2 py-1.5 text-[10px] text-white/60 line-clamp-2">{draft.welcomeMessage}</div>
              )}
            </div>
            <p className="text-center text-[10px] text-white/30 mt-3">{draft.footerText || 'Pie de página'}</p>
          </div>
          <p className="text-[11px] text-white/30 mt-2">
            Así se verá en el link público que compartes desde Eventos.
          </p>
        </div>
      </div>
    </Card>
  )
}

function SaveButton() {
  return (
    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors">
      <Save className="w-4 h-4" /> Guardar cambios
    </button>
  )
}

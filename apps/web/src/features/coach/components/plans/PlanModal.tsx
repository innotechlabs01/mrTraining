'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Tag, Eye, EyeOff, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan, PlanDiscount, TrainingMode, PlanCurrency } from '@/features/coach/types'
import { getPlanDiscountedPrice, getPlanDiscountAmount, isPlanDiscountActive } from '@/features/coach/utils/planDiscount'
import { formatPlanPrice, formatConversionPreview, validateForPublish, periodLabel } from '@/features/coach/utils/planPricing'
import { coachingApi } from '@/features/shared/api/client'

const TRAINING_MODES: { id: TrainingMode; label: string }[] = [
  { id: 'virtual', label: 'Virtual' },
  { id: 'presencial', label: 'Presencial' },
  { id: 'hibrido', label: 'Híbrido' },
  { id: 'running', label: 'Running' },
]

const BILLING_PERIODS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
] as const

const CURRENCIES: { value: PlanCurrency; label: string }[] = [
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'USD', label: 'USD — Dólar' },
]

interface PlanModalProps {
  open: boolean
  plan?: Plan | null
  onClose: () => void
  onSave: (plan: Plan) => void
}

export function PlanModal({ open, plan, onClose, onSave }: PlanModalProps) {
  const isEditing = !!plan

  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [price, setPrice] = useState(String(plan?.price ?? ''))
  const [currency, setCurrency] = useState<PlanCurrency>(plan?.currency ?? 'COP')
  const [billingPeriod, setBillingPeriod] = useState<Plan['billingPeriod']>(plan?.billingPeriod ?? 'monthly')
  const [trainingMode, setTrainingMode] = useState<TrainingMode[]>(plan?.trainingMode ?? ['virtual'])
  const [maxAthletes, setMaxAthletes] = useState(String(plan?.maxAthletes ?? ''))
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState(String(plan?.maxSessionsPerWeek ?? ''))
  const [features, setFeatures] = useState<string[]>(plan?.features ?? [])
  const [isActive, setIsActive] = useState(plan?.isActive ?? false)

  const [discountEnabled, setDiscountEnabled] = useState(!!plan?.discount)
  const [discountType, setDiscountType] = useState<PlanDiscount['type']>(plan?.discount?.type ?? 'percentage')
  const [discountValue, setDiscountValue] = useState(String(plan?.discount?.value ?? ''))
  const [discountLabel, setDiscountLabel] = useState(plan?.discount?.label ?? '')
  const [discountValidFrom, setDiscountValidFrom] = useState(plan?.discount?.validFrom ?? '')
  const [discountValidUntil, setDiscountValidUntil] = useState(plan?.discount?.validUntil ?? '')
  const [discountCode, setDiscountCode] = useState(plan?.discount?.code ?? '')

  const [error, setError] = useState('')
  const [publishErrors, setPublishErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [trm, setTrm] = useState<number | null>(plan?.trm ?? null)
  const [trmLoading, setTrmLoading] = useState(false)
  const [trmError, setTrmError] = useState<string | null>(null)

  useEffect(() => {
    if (currency === 'USD' && !trm) {
      fetchTrm()
    }
  }, [currency])

  const fetchTrm = async () => {
    setTrmLoading(true)
    setTrmError(null)
    try {
      const res = await coachingApi.getTRM<{ value: number; vigencia_desde: string }>()
      setTrm(res.value)
    } catch {
      setTrmError('No se pudo obtener el TRM automáticamente')
    } finally {
      setTrmLoading(false)
    }
  }

  const previewPlan: Plan = {
    id: plan?.id ?? 'preview',
    name,
    description,
    price: Number(price) || 0,
    currency,
    billingPeriod,
    trainingMode,
    maxAthletes: Number(maxAthletes) || 0,
    maxSessionsPerWeek: Number(maxSessionsPerWeek) || 0,
    features,
    isActive,
    athleteCount: plan?.athleteCount ?? 0,
    trm: trm ?? undefined,
    discount: discountEnabled
      ? {
          type: discountType,
          value: Number(discountValue) || 0,
          label: discountLabel || undefined,
          validFrom: discountValidFrom || undefined,
          validUntil: discountValidUntil || undefined,
          code: discountCode || undefined,
        }
      : null,
  }

  const discountActive = isPlanDiscountActive(previewPlan)
  const finalPrice = getPlanDiscountedPrice(previewPlan)
  const saved = getPlanDiscountAmount(previewPlan)
  const conversionPreview = currency === 'USD' && trm ? formatConversionPreview(finalPrice, trm) : null

  const toggleMode = (m: TrainingMode) =>
    setTrainingMode((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))

  const updateFeature = (i: number, val: string) =>
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? val : f)))
  const removeFeature = (i: number) => setFeatures((prev) => prev.filter((_, idx) => idx !== i))
  const addFeature = () => setFeatures((prev) => [...prev, ''])

  const handlePublishToggle = (nextValue: boolean) => {
    const validation = validateForPublish({
      name,
      price,
      trainingMode,
      features,
    })
    if (nextValue && validation.length > 0) {
      setPublishErrors(validation)
      return
    }
    setPublishErrors([])
    setIsActive(nextValue)
  }

  const handleSave = async () => {
    setError('')
    const validation = validateForPublish({
      name,
      price,
      trainingMode,
      features,
    })
    if (validation.length > 0) {
      setError(validation[0])
      return
    }
    if (discountEnabled && (!discountValue || Number(discountValue) <= 0)) {
      setError('Ingresa el valor del descuento')
      return
    }
    if (discountEnabled && discountValidUntil && discountValidFrom && discountValidUntil < discountValidFrom) {
      setError('La vigencia fin debe ser mayor a la de inicio')
      return
    }

    setSubmitting(true)
    try {
      const result: Plan = {
        ...previewPlan,
        id: plan?.id ?? `plan-${crypto.randomUUID().slice(0, 8)}`,
      }
      onSave(result)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-2xl shadow-2xl"
      >
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-surface-1 border-b border-white/10">
          <h3 id="plan-modal-title" className="text-lg font-display font-bold text-white">
            {isEditing ? 'Editar Plan' : 'Nuevo Plan'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form className="px-6 py-5 space-y-5 lg:border-r lg:border-white/10">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="plan-name">Nombre</Label>
                <input
                  id="plan-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pro"
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="plan-description">Descripción</Label>
                <textarea
                  id="plan-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Breve descripción del plan"
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              <div>
                <Label htmlFor="plan-price">Precio</Label>
                <input
                  id="plan-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currency === 'COP' ? '150000' : '45'}
                  className={cn(inputClass, 'tabular-nums')}
                  aria-describedby={conversionPreview ? 'conversion-preview' : undefined}
                />
              </div>
              <div>
                <Label htmlFor="plan-currency">Moneda</Label>
                <select
                  id="plan-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as PlanCurrency)}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-surface-1">{c.label}</option>
                  ))}
                </select>
              </div>

              {conversionPreview && (
                <p
                  id="conversion-preview"
                  aria-live="polite"
                  className="col-span-2 -mt-1 text-xs text-white/50 tabular-nums"
                >
                  {conversionPreview}
                </p>
              )}

              {currency === 'USD' && (
                <div className="col-span-2">
                  <Label htmlFor="plan-trm">TRM (tasa de cambio)</Label>
                  <input
                    id="plan-trm"
                    inputMode="decimal"
                    value={trm?.toString() ?? ''}
                    readOnly
                    className={cn(inputClass, 'tabular-nums py-1.5 text-white/80 bg-surface-1', trmLoading && 'opacity-60 cursor-wait')}
                    aria-describedby="plan-trm-help"
                  />
                  <p id="plan-trm-help" className="mt-1.5 text-xs text-white/50 tabular-nums">
                    {trmLoading ? 'Obteniendo TRM de referencia…' : trmError ? (
                      <span className="text-red-400">{trmError}</span>
                    ) : trm ? (
                      <>TRM de referencia: ${formatPlanPrice(trm, 'COP')} — actualizado hace instantes</>
                    ) : (
                      'TRM no disponible'
                    )}
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <Label htmlFor="plan-period">Periodo de facturación</Label>
                <select
                  id="plan-period"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value as Plan['billingPeriod'])}
                  className={inputClass}
                >
                  {BILLING_PERIODS.map((b) => (
                    <option key={b.value} value={b.value} className="bg-surface-1">{b.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="plan-max-athletes">Atletas máx.</Label>
                <input
                  id="plan-max-athletes"
                  type="number"
                  min={0}
                  value={maxAthletes}
                  onChange={(e) => setMaxAthletes(e.target.value)}
                  placeholder="30"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="plan-max-sessions">Sesiones/sem</Label>
                <input
                  id="plan-max-sessions"
                  type="number"
                  min={0}
                  value={maxSessionsPerWeek}
                  onChange={(e) => setMaxSessionsPerWeek(e.target.value)}
                  placeholder="4"
                  className={inputClass}
                />
              </div>

              <div className="col-span-2">
                <Label>Modalidades</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TRAINING_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMode(m.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                        trainingMode.includes(m.id)
                          ? 'bg-brand-primary/15 border-brand-primary text-white'
                          : 'bg-surface-2 border-white/10 text-white/50 hover:text-white/80',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label>Características</Label>
                <div className="space-y-2 pt-1">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={f}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder="Característica"
                        className={inputClass}
                      />
                      <button
                        onClick={() => removeFeature(i)}
                        className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Eliminar característica"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addFeature}
                    className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar característica
                  </button>
                </div>
              </div>

              <div className="col-span-2 pt-3 border-t border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-white">Publicar en mi landing</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => handlePublishToggle(!isActive)}
                    disabled={submitting}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      isActive ? 'bg-brand-primary' : 'bg-white/15',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                        isActive ? 'left-[22px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </label>
                {publishErrors.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 space-y-1" role="alert">
                    {publishErrors.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDiscountEnabled((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-white/80"
                >
                  <Tag className={cn('w-4 h-4', discountEnabled ? 'text-brand-primary' : 'text-white/40')} />
                  Aplicar descuento
                  <span
                    className={cn(
                      'ml-auto w-11 h-6 rounded-full transition-colors relative',
                      discountEnabled ? 'bg-brand-primary' : 'bg-white/15',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                        discountEnabled ? 'left-[22px]' : 'left-0.5',
                      )}
                    />
                  </span>
                </button>

                {discountEnabled && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as PlanDiscount['type'])}
                          className={inputClass}
                        >
                          <option value="percentage" className="bg-surface-1">Porcentaje (%)</option>
                          <option value="fixed" className="bg-surface-1">Monto fijo ($)</option>
                        </select>
                      </div>
                      <div>
                        <Label>{discountType === 'percentage' ? 'Porcentaje' : 'Monto'}</Label>
                        <input
                          type="number"
                          min={0}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === 'percentage' ? '20' : '15'}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Vigencia desde</Label>
                        <input
                          type="date"
                          value={discountValidFrom}
                          onChange={(e) => setDiscountValidFrom(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <Label>Vigencia hasta</Label>
                        <input
                          type="date"
                          value={discountValidUntil}
                          onChange={(e) => setDiscountValidUntil(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Etiqueta (opcional)</Label>
                        <input
                          value={discountLabel}
                          onChange={(e) => setDiscountLabel(e.target.value)}
                          placeholder="Promo verano"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <Label>Código (opcional)</Label>
                        <input
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          placeholder="VERANO20"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-surface-2 border border-white/10 px-4 py-3 flex items-center justify-between tabular-nums">
                      <span className="text-xs text-white/40">Precio final</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-white font-display">{formatPlanPrice(finalPrice, currency)}</span>
                        {discountActive && saved > 0 && (
                          <span className="ml-2 text-xs text-green-400">ahorras {formatPlanPrice(saved, currency)}</span>
                        )}
                        {!discountActive && discountEnabled && (
                          <span className="ml-2 text-xs text-white/30">(fuera de vigencia)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>

          <aside className="px-6 py-5 bg-surface-2/50 lg:sticky lg:top-[65px] lg:self-start lg:max-h-[calc(90vh-65px)] lg:overflow-y-auto">
            <PreviewPanel
              name={name}
              description={description}
              price={Number(price) || 0}
              finalPrice={finalPrice}
              saved={saved}
              discountActive={discountActive}
              currency={currency}
              billingPeriod={billingPeriod}
              features={features}
              isActive={isActive}
            />
          </aside>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-surface-1 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear plan'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function PreviewPanel({
  name,
  description,
  price,
  finalPrice,
  saved,
  discountActive,
  currency,
  billingPeriod,
  features,
  isActive,
}: {
  name: string
  description: string
  price: number
  finalPrice: number
  saved: number
  discountActive: boolean
  currency: PlanCurrency
  billingPeriod: Plan['billingPeriod']
  features: string[]
  isActive: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-2 p-4 space-y-4">
      {isActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] font-medium text-green-400">
          <Eye className="w-3 h-3" aria-hidden="true" /> Publicado — visible en tu landing
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
          <EyeOff className="w-3 h-3" aria-hidden="true" /> Borrador — no visible
        </span>
      )}

      <div>
        <p className="text-sm font-semibold text-white">{name || 'Sin nombre'}</p>
        <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{description}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
        <span className="text-2xl font-bold font-display text-white">{formatPlanPrice(finalPrice, currency)}</span>
        {discountActive && <span className="text-sm text-white/30 line-through">{formatPlanPrice(price, currency)}</span>}
        {discountActive && saved > 0 && <span className="text-xs text-green-400">ahorras {formatPlanPrice(saved, currency)}</span>}
        <span className="ml-auto text-xs text-white/40">/{periodLabel(billingPeriod)}</span>
      </div>

      <ul className="space-y-1.5 border-t border-white/10 pt-3">
        {features.filter(Boolean).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-white/60">
            <Check className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      {features.filter(Boolean).length === 0 && (
        <p className="text-xs text-white/40 pt-3 border-t border-white/10">Agrega características para previsualizar.</p>
      )}
    </div>
  )
}

const inputClass =
  'w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary transition-colors'

function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label className={cn('block text-xs font-medium text-white/50 mb-1.5', className)} htmlFor={htmlFor}>
      {children}
    </label>
  )
}
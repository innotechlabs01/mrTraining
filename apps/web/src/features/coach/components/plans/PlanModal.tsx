'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan, PlanDiscount, TrainingMode } from '@/features/coach/types';
import { getPlanDiscountedPrice, getPlanDiscountAmount, isPlanDiscountActive } from '@/features/coach/utils/planDiscount';

const TRAINING_MODES: { id: TrainingMode; label: string }[] = [
  { id: 'virtual', label: 'Virtual' },
  { id: 'presencial', label: 'Presencial' },
  { id: 'hibrido', label: 'Híbrido' },
  { id: 'running', label: 'Running' },
];

const BILLING_PERIODS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
] as const;

interface PlanModalProps {
  open: boolean;
  plan?: Plan | null;
  onClose: () => void;
  onSave: (plan: Plan) => void;
}

export function PlanModal({ open, plan, onClose, onSave }: PlanModalProps) {
  const isEditing = !!plan;

  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [price, setPrice] = useState(String(plan?.price ?? ''));
  const [currency, setCurrency] = useState(plan?.currency ?? 'USD');
  const [billingPeriod, setBillingPeriod] = useState<Plan['billingPeriod']>(plan?.billingPeriod ?? 'monthly');
  const [trainingMode, setTrainingMode] = useState<TrainingMode[]>(plan?.trainingMode ?? ['virtual']);
  const [maxAthletes, setMaxAthletes] = useState(String(plan?.maxAthletes ?? ''));
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState(String(plan?.maxSessionsPerWeek ?? ''));
  const [features, setFeatures] = useState<string[]>(plan?.features ?? []);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);

  const [discountEnabled, setDiscountEnabled] = useState(!!plan?.discount);
  const [discountType, setDiscountType] = useState<PlanDiscount['type']>(plan?.discount?.type ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(String(plan?.discount?.value ?? ''));
  const [discountLabel, setDiscountLabel] = useState(plan?.discount?.label ?? '');
  const [discountValidFrom, setDiscountValidFrom] = useState(plan?.discount?.validFrom ?? '');
  const [discountValidUntil, setDiscountValidUntil] = useState(plan?.discount?.validUntil ?? '');
  const [discountCode, setDiscountCode] = useState(plan?.discount?.code ?? '');

  const [error, setError] = useState('');

  if (!open) return null;

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
  };

  const active = isPlanDiscountActive(previewPlan);
  const finalPrice = getPlanDiscountedPrice(previewPlan);
  const saved = getPlanDiscountAmount(previewPlan);

  const toggleMode = (m: TrainingMode) =>
    setTrainingMode((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const updateFeature = (i: number, val: string) =>
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? val : f)));
  const removeFeature = (i: number) => setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  const addFeature = () => setFeatures((prev) => [...prev, '']);

  const handleSave = () => {
    setError('');
    if (!name.trim()) { setError('Ingresa el nombre del plan'); return; }
    if (!price || Number(price) <= 0) { setError('Ingresa un precio válido'); return; }
    if (trainingMode.length === 0) { setError('Selecciona al menos una modalidad'); return; }
    if (discountEnabled && (!discountValue || Number(discountValue) <= 0)) {
      setError('Ingresa el valor del descuento'); return;
    }
    if (discountEnabled && discountValidUntil && discountValidFrom && discountValidUntil < discountValidFrom) {
      setError('La vigencia fin debe ser mayor a la de inicio'); return;
    }

    const result: Plan = {
      ...previewPlan,
      id: plan?.id ?? `plan-${crypto.randomUUID().slice(0, 8)}`,
    };
    onSave(result);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-1 border-b border-white/10">
          <h3 className="text-lg font-display font-bold text-white">
            {isEditing ? 'Editar Plan' : 'Nuevo Plan'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nombre</Label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pro"
                className={inputClass} />
            </div>
            <div className="col-span-2">
              <Label>Descripción</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Breve descripción del plan" className={cn(inputClass, 'resize-none')} />
            </div>

            <div>
              <Label>Precio</Label>
              <input type="number" value={price} min={0}
                onChange={(e) => setPrice(e.target.value)} placeholder="99" className={inputClass} />
            </div>
            <div>
              <Label>Moneda</Label>
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" className={inputClass} />
            </div>

            <div className="col-span-2">
              <Label>Periodo de facturación</Label>
              <select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as Plan['billingPeriod'])}
                className={inputClass}>
                {BILLING_PERIODS.map((b) => (
                  <option key={b.value} value={b.value} className="bg-surface-1">{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Atletas máx.</Label>
              <input type="number" value={maxAthletes} min={0}
                onChange={(e) => setMaxAthletes(e.target.value)} placeholder="30" className={inputClass} />
            </div>
            <div>
              <Label>Sesiones/sem</Label>
              <input type="number" value={maxSessionsPerWeek} min={0}
                onChange={(e) => setMaxSessionsPerWeek(e.target.value)} placeholder="30" className={inputClass} />
            </div>

            <div className="col-span-2">
              <Label>Modalidades</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {TRAINING_MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => toggleMode(m.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                      trainingMode.includes(m.id)
                        ? 'bg-brand-primary/15 border-brand-primary text-white'
                        : 'bg-surface-2 border-white/10 text-white/50 hover:text-white/80',
                    )}>
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
                    <input value={f} onChange={(e) => updateFeature(i, e.target.value)} placeholder="Característica"
                      className={inputClass} />
                    <button onClick={() => removeFeature(i)}
                      className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addFeature}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Plus className="w-4 h-4" /> Agregar característica
                </button>
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between">
              <Label className="mb-0">Plan activo</Label>
              <button onClick={() => setIsActive((v) => !v)}
                className={cn('w-11 h-6 rounded-full transition-colors relative', isActive ? 'bg-brand-primary' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', isActive ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            {/* Descuento */}
            <div className="col-span-2 pt-3 border-t border-white/10">
              <button type="button" onClick={() => setDiscountEnabled((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Tag className={cn('w-4 h-4', discountEnabled ? 'text-brand-primary' : 'text-white/40')} />
                Aplicar descuento
                <span className={cn('ml-auto w-11 h-6 rounded-full transition-colors relative', discountEnabled ? 'bg-brand-primary' : 'bg-white/15')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', discountEnabled ? 'left-[22px]' : 'left-0.5')} />
                </span>
              </button>

              {discountEnabled && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo</Label>
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value as PlanDiscount['type'])}
                        className={inputClass}>
                        <option value="percentage" className="bg-surface-1">Porcentaje (%)</option>
                        <option value="fixed" className="bg-surface-1">Monto fijo ($)</option>
                      </select>
                    </div>
                    <div>
                      <Label>{discountType === 'percentage' ? 'Porcentaje' : 'Monto'}</Label>
                      <input type="number" value={discountValue} min={0}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? '20' : '15'} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Vigencia desde</Label>
                      <input type="date" value={discountValidFrom} onChange={(e) => setDiscountValidFrom(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <Label>Vigencia hasta</Label>
                      <input type="date" value={discountValidUntil} onChange={(e) => setDiscountValidUntil(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Etiqueta (opcional)</Label>
                      <input value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="Promo verano" className={inputClass} />
                    </div>
                    <div>
                      <Label>Código (opcional)</Label>
                      <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="VERANO20" className={inputClass} />
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-2 border border-white/10 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-white/40">Precio final</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white font-display">${finalPrice}</span>
                      {active && saved > 0 && (
                        <span className="ml-2 text-xs text-green-400">ahorras ${saved}</span>
                      )}
                      {!active && discountEnabled && (
                        <span className="ml-2 text-xs text-white/30">(fuera de vigencia)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-surface-1 border-t border-white/10">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors">
            {isEditing ? 'Guardar cambios' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary transition-colors';

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block text-xs font-medium text-white/50 mb-1.5', className)}>{children}</label>
  );
}

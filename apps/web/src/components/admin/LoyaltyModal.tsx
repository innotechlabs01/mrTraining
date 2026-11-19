'use client';

import { useState } from 'react';
import {
  X,
  Sparkles,
  Gift,
  CheckCircle2,
  Award,
  QrCode,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoyaltyModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoyaltyModal({ open, onClose }: LoyaltyModalProps) {
  const [step, setStep] = useState(1);
  const [cardName, setCardName] = useState('FitFlow VIP Exclusive');
  const [tier, setTier] = useState<'Gold' | 'Silver' | 'Platinum'>('Gold');
  const [discountPct, setDiscountPct] = useState('50');
  const [pointsPerVisit, setPointsPerVisit] = useState('10');
  const [freeGuestPass, setFreeGuestPass] = useState(true);
  const [saunaAccess, setSaunaAccess] = useState(true);
  const [trainerSession, setTrainerSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setStep(1);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#26262B] bg-[#141418] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#26262B] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E0413A] to-[#8B5CF6] text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Loyalty Card Setup Wizard</h2>
              <p className="text-xs text-[#8E8E93]">Crea y configura el programa de fidelización del club</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#202026] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center border-b border-[#26262B] bg-[#101014] px-6 py-2.5">
          {[
            { num: 1, label: 'Tipo y Nivel' },
            { num: 2, label: 'Beneficios' },
            { num: 3, label: 'Previsualización' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    step >= s.num ? 'bg-[#E07A3D] text-white' : 'bg-[#202026] text-[#71717A]'
                  )}
                >
                  {s.num}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    step >= s.num ? 'text-white' : 'text-[#71717A]'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && <div className="mx-4 h-0.5 flex-1 bg-[#26262B]" />}
            </div>
          ))}
        </div>

        {/* Body content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-white">¡Loyalty Card Activada con Éxito!</h3>
              <p className="mt-1 text-sm text-[#8E8E93] max-w-sm">
                La tarjeta de membresía ya está disponible para que los atletas la agreguen a su Apple Wallet / Google Pay.
              </p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                      Nombre del Programa de Fidelidad
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] px-3.5 py-2.5 text-sm text-white focus:border-[#E07A3D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
                      Nivel de Membresía (Tier)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Gold', 'Silver', 'Platinum'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTier(t)}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all',
                            tier === t
                              ? 'border-[#E07A3D] bg-[#E07A3D]/10 text-white shadow-lg'
                              : 'border-[#26262B] bg-[#16161C] text-[#A1A1AA] hover:border-[#383842]'
                          )}
                        >
                          <Award
                            size={24}
                            className={cn(
                              tier === t
                                ? t === 'Gold'
                                  ? 'text-amber-400'
                                  : t === 'Silver'
                                  ? 'text-slate-300'
                                  : 'text-emerald-400'
                                : 'text-[#71717A]'
                            )}
                          />
                          <span className="mt-2 text-sm font-bold">{t} Club</span>
                          <span className="text-[11px] text-[#71717A]">
                            {t === 'Gold' ? 'Recomendado' : t === 'Platinum' ? 'VIP Todo Incluido' : 'Acceso Básico'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                        % Descuento Inicial (Voucher)
                      </label>
                      <input
                        type="number"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value)}
                        className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] px-3.5 py-2.5 text-sm text-white focus:border-[#E07A3D] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                        Puntos por Check-in
                      </label>
                      <input
                        type="number"
                        value={pointsPerVisit}
                        onChange={(e) => setPointsPerVisit(e.target.value)}
                        className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] px-3.5 py-2.5 text-sm text-white focus:border-[#E07A3D] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Beneficios y Perks incluidos</h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between rounded-xl border border-[#26262B] bg-[#181820] p-3.5 cursor-pointer hover:border-[#383842] transition-colors">
                      <div className="flex items-center gap-3">
                        <Gift className="text-[#E07A3D]" size={20} />
                        <div>
                          <div className="text-sm font-medium text-white">Pases de Invitado Gratis (1 al mes)</div>
                          <div className="text-xs text-[#8E8E93]">El miembro puede traer 1 amigo por ciclo</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={freeGuestPass}
                        onChange={(e) => setFreeGuestPass(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-700 text-[#E07A3D] focus:ring-[#E07A3D]"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#26262B] bg-[#181820] p-3.5 cursor-pointer hover:border-[#383842] transition-colors">
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-purple-400" size={20} />
                        <div>
                          <div className="text-sm font-medium text-white">Zona Húmeda y Sauna Ilimitado</div>
                          <div className="text-xs text-[#8E8E93]">Acceso prioritario post-entrenamiento</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={saunaAccess}
                        onChange={(e) => setSaunaAccess(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-700 text-[#E07A3D] focus:ring-[#E07A3D]"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-[#26262B] bg-[#181820] p-3.5 cursor-pointer hover:border-[#383842] transition-colors">
                      <div className="flex items-center gap-3">
                        <Award className="text-amber-400" size={20} />
                        <div>
                          <div className="text-sm font-medium text-white">Sesión con Entrenador Personal</div>
                          <div className="text-xs text-[#8E8E93]">1 evaluación física y diagnóstico cada mes</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={trainerSession}
                        onChange={(e) => setTrainerSession(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-700 text-[#E07A3D] focus:ring-[#E07A3D]"
                      />
                    </label>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <p className="text-xs text-[#8E8E93]">Revisa el diseño de la tarjeta antes de publicarla</p>
                  </div>

                  {/* 3D Realistic Loyalty Card Preview */}
                  <div className="mx-auto max-w-sm overflow-hidden rounded-2xl p-6 text-white shadow-2xl relative border border-white/10 bg-gradient-to-br from-[#1E1E26] via-[#2A1D1A] to-[#121217]">
                    <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-[#E07A3D]/30 to-purple-600/20 blur-2xl rounded-full" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-[#E07A3D] flex items-center justify-center font-black text-xs">
                          F
                        </div>
                        <span className="font-bold tracking-tight text-white">FitFlow Club</span>
                      </div>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-300/30">
                        {tier} MEMBER
                      </span>
                    </div>

                    <div className="relative z-10 my-6">
                      <div className="text-lg font-black tracking-wide text-white">{cardName}</div>
                      <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                        {discountPct}% OFF FIRST MONTH + GIFT VOUCHER
                      </div>
                    </div>

                    <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-3">
                      <div>
                        <div className="text-[10px] uppercase text-[#8E8E93]">Puntos acumulables</div>
                        <div className="text-xs font-bold text-white">+{pointsPerVisit} pts / check-in</div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-white">
                        <QrCode size={22} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#26262B] bg-[#141418] p-3 text-xs text-[#8E8E93] text-center">
                    Al confirmar, el nuevo diseño se sincronizará con la app móvil y el portal de miembros.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer controls */}
        {!isSuccess && (
          <div className="flex items-center justify-between border-t border-[#26262B] bg-[#101014] px-6 py-4">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors',
                step === 1 ? 'text-[#52525B] cursor-not-allowed' : 'text-[#D1D1D6] hover:bg-[#202026]'
              )}
            >
              <ArrowLeft size={14} /> Anterior
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#E07A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#D0692D] transition-colors"
              >
                Siguiente <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E07A3D] to-[#EC4899] px-5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
              >
                {isSubmitting ? 'Guardando...' : 'Publicar y Activar Tarjeta'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

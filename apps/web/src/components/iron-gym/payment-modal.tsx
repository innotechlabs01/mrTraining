'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, CheckCircle, User, Phone, Mail, Tag, Check, CreditCard } from 'lucide-react';
import type { PlanDiscount } from '@/features/coach/types';
import { usePaymentMethods } from '@/features/coach/hooks/usePaymentMethods';
import { isPaymentMethodComplete } from '@/features/coach/types';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: { name: string; price: number; period: string; discount?: PlanDiscount | null };
}

const PLAN_TYPES = [
  { id: 'running', label: 'Running', desc: 'Entrenamiento al aire libre' },
  { id: 'presencial', label: 'Presencial', desc: 'Entrenamiento en gimnasio' },
  { id: 'virtual', label: 'Virtual', desc: 'Entrenamiento online' },
];

export function PaymentModal({ open, onClose, plan }: PaymentModalProps) {
  const router = useRouter();
  const { methods } = usePaymentMethods();
  const activeMethods = useMemo(() => methods.filter(isPaymentMethodComplete), [methods]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planType, setPlanType] = useState('');
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const [error, setError] = useState('');

  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeValid, setCodeValid] = useState(false);

  if (!open) return null;

  const discount = plan.discount ?? null;
  const hasDiscount = !!discount && discount.value > 0;
  const requiresCode = hasDiscount && !!discount!.code;

  const finalPrice = useMemo(() => {
    if (!hasDiscount || (requiresCode && !codeValid)) return plan.price;
    const d = discount!;
    const amount = d.type === 'percentage' ? Math.round((plan.price * d.value) / 100) : Math.min(plan.price, d.value);
    return Math.max(0, plan.price - amount);
  }, [hasDiscount, requiresCode, codeValid, discount, plan.price]);

  const saved = plan.price - finalPrice;

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleApplyCode = () => {
    if (!discount?.code) return;
    if (codeInput.trim().toUpperCase() === discount.code.toUpperCase()) {
      setCodeValid(true);
      setCodeError('');
    } else {
      setCodeValid(false);
      setCodeError('Código no válido');
    }
  };

  const handlePay = () => {
    setError('');

    if (!name.trim()) { setError('Ingresa tu nombre'); return; }
    if (!validateEmail(email)) { setError('Ingresa un email válido'); return; }
    if (!phone.trim()) { setError('Ingresa tu teléfono'); return; }
    if (!planType) { setError('Selecciona un tipo de plan'); return; }

    setStep('loading');

    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  const handleSuccessClose = () => {
    onClose();
    const params = new URLSearchParams({
      email: encodeURIComponent(email),
      plan: plan.name.toLowerCase().replace(/\s+/g, '-'),
      planType,
      discount: codeValid && hasDiscount ? (discount?.code ?? 'auto') : 'none',
    });
    router.push(`/sign-up?${params.toString()}`);
  };

  const discountLabel =
    discount?.type === 'percentage' ? `${discount.value}% OFF` : `$${discount?.value} OFF`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'form' ? onClose : undefined} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <Loader2 className="w-16 h-16 text-brand-primary animate-spin" />
            <p className="mt-6 text-lg font-semibold text-[#424242]">Procesando pago...</p>
            <p className="mt-2 text-sm text-[#9e9e9e]">Por favor espera un momento</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <CheckCircle className="w-20 h-20 text-green-500" />
            <h3 className="mt-6 text-2xl font-bold text-[#424242]">Pago Exitoso</h3>
            <p className="mt-2 text-center text-sm text-[#9e9e9e] max-w-xs">
              Tu plan <span className="font-semibold text-[#424242]">{plan.name}</span> ha sido
              activado correctamente. Te redirigiremos para crear tu cuenta.
            </p>
            <button
              onClick={handleSuccessClose}
              className="mt-8 w-full py-3 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
            >
              Crear mi cuenta
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-[#9e9e9e] hover:text-[#424242] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-[#424242]">Confirmar Plan</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-brand-primary">${finalPrice}</span>
                {saved > 0 && (
                  <span className="text-sm text-[#bdbdbd] line-through">${plan.price}</span>
                )}
                <span className="text-sm text-[#9e9e9e]">{plan.period}</span>
                <span className="ml-2 text-sm font-medium text-[#757575]">{plan.name}</span>
              </div>

              {hasDiscount && (
                <div className="mt-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-3 py-2">
                  {requiresCode ? (
                    codeValid ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        <span>{discountLabel} aplicado · {discount!.label ?? 'Descuento'}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-[#757575]">
                          <Tag className="w-4 h-4 text-brand-primary" />
                          {discountLabel} {discount!.label && `· ${discount!.label}`}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={codeInput}
                            onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
                            placeholder="Ingresa tu código"
                            className="flex-1 h-9 px-3 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] focus:outline-none focus:border-brand-primary"
                          />
                          <button
                            onClick={handleApplyCode}
                            className="px-3 h-9 rounded-md bg-[#212121] text-white text-sm font-medium hover:bg-[#424242] transition-colors"
                          >
                            Aplicar
                          </button>
                        </div>
                        {codeError && <p className="text-xs text-red-500">{codeError}</p>}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Tag className="w-4 h-4" />
                      <span>{discountLabel} {discount!.label && `· ${discount!.label}`} aplicado automáticamente</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e9e9e]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e9e9e]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej: juan@email.com"
                    className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e9e9e]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +52 555 123 4567"
                    className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-200 text-sm text-[#424242] placeholder:text-[#bdbdbd] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Tipo de plan
                </label>
                <div className="grid gap-2">
                  {PLAN_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPlanType(t.id)}
                      className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                        planType === t.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        planType === t.id ? 'border-brand-primary' : 'border-[#bdbdbd]'
                      }`}>
                        {planType === t.id && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#424242]">{t.label}</p>
                        <p className="text-xs text-[#9e9e9e]">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-2 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#757575] uppercase tracking-wide">
                  Medio de pago
                </label>
                {activeMethods.length === 0 ? (
                  <p className="text-xs text-[#9e9e9e]">
                    El coach aún no ha configurado una cuenta bancaria.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeMethods.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-brand-primary shrink-0" />
                          <p className="text-sm font-semibold text-[#424242]">{m.bank}</p>
                          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium text-brand-primary">
                            Transferencia
                          </span>
                        </div>
                        <dl className="mt-2 space-y-0.5 text-xs text-[#757575]">
                          <div className="flex gap-1"><dt className="font-medium text-[#9e9e9e]">Titular:</dt><dd>{m.holder}</dd></div>
                          <div className="flex gap-1"><dt className="font-medium text-[#9e9e9e]">Tipo:</dt><dd>{m.accountType === 'savings' ? 'Cuenta de ahorro' : 'Cuenta de cheques'}</dd></div>
                          <div className="flex gap-1"><dt className="font-medium text-[#9e9e9e]">Nº de cuenta:</dt><dd>{m.accountNumber}</dd></div>
                          <div className="flex gap-1"><dt className="font-medium text-[#9e9e9e]">CLABE:</dt><dd>{m.clabe}</dd></div>
                          {m.notes && <div className="flex gap-1"><dt className="font-medium text-[#9e9e9e]">Notas:</dt><dd>{m.notes}</dd></div>}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <button
                onClick={handlePay}
                className="w-full py-3 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
              >
                Pagar — ${finalPrice}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Plus,
  X,
  Dumbbell,
  Zap,
  Users,
  Award,
  Minus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStepper } from './OnboardingStepper';
import { PlanSummaryCard } from './PlanSummaryCard';
import { useSelectedPlan } from '../hooks/useSelectedPlan';

interface Certification {
  name: string;
  org: string;
}

interface CoachOnboardingProps {
  onComplete: (data: CoachOnboardingData) => void;
  onSkip?: () => void;
  selectedPlan?: string;
}

export interface CoachOnboardingData {
  sports: string[];
  specializations: string[];
  experience: string;
  teamName: string;
  teamSize: number;
  ageGroup: string;
  certifications: Certification[];
  planId: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  max_athletes: number;
  max_sessions_per_week: number;
  is_active: boolean;
  coach_id: string;
  trm: number;
}

const SPORTS = [
  'Football',
  'Basketball',
  'Soccer',
  'Baseball',
  'Track & Field',
  'Swimming',
  'Wrestling',
  'Tennis',
  'Golf',
  'CrossFit',
  'Other',
];

const SPECIALIZATIONS = [
  'Speed & Agility',
  'Strength & Conditioning',
  'Skill Development',
  'Nutrition Planning',
  'Injury Prevention',
  'Mental Performance',
];

const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    title: 'Principiante (0-2 años)',
    description: 'Nuevo en el oficio, construyendo experiencia base',
    icon: Dumbbell,
  },
  {
    id: 'intermediate',
    title: 'Intermedio (3-5 años)',
    description: 'Coach con experiencia y resultados crecientes',
    icon: Zap,
  },
  {
    id: 'advanced',
    title: 'Avanzado (6-10 años)',
    description: 'Coach con trayectoria comprobada',
    icon: Users,
  },
  {
    id: 'elite',
    title: 'Élite (10+ años)',
    description: 'Coach de alto nivel en la cima de laprofession',
    icon: Award,
  },
];

const AGE_GROUPS = [
  'Youth',
  'High School',
  'Collegiate',
  'Professional',
  'Adult Recreational',
];

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Principiante (0-2 años)',
  intermediate: 'Intermedio (3-5 años)',
  advanced: 'Avanzado (6-10 años)',
  elite: 'Élite (10+ años)',
};

const STEPS = [
  { id: 'plan', title: 'Plan', description: 'Tu plan de plataforma' },
  { id: 'sport', title: 'Deporte', description: 'Deporte y especialización' },
  { id: 'experience', title: 'Experiencia', description: 'Tu nivel de experiencia' },
  { id: 'team', title: 'Equipo', description: 'Datos del equipo' },
  { id: 'certifications', title: 'Credenciales', description: 'Tus credenciales' },
  { id: 'review', title: 'Revisión', description: 'Confirma tu perfil' },
];

export function CoachOnboarding({ onComplete, onSkip, selectedPlan }: CoachOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [planId, setPlanId] = useState(selectedPlan || '');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [sports, setSports] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(1);
  const [ageGroup, setAgeGroup] = useState('');
  const [certifications, setCertifications] = useState<Certification[]>([{ name: '', org: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { plan: paidPlan, loading: paidPlanLoading } = useSelectedPlan(selectedPlan ?? null);
  // The plan is settled at the marketing step and paid before the onboarding
  // starts, so step 0 is read-only whenever the plan is known.
  const hasSettledPlan = Boolean(selectedPlan) && paidPlan !== null;

  useEffect(() => {
    fetch('/api/marketing/plans')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const list: Plan[] = Array.isArray(data)
          ? (data as Plan[])
          : ((data as { data?: Plan[] })?.data ?? []);
        const activePlans = list.filter((p) => p.is_active);
        setPlans(activePlans);
        if (selectedPlan && activePlans.some((p: Plan) => p.id === selectedPlan)) {
          setPlanId(selectedPlan);
        }
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [selectedPlan]);

  const toggleSport = (sport: string) => {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  };

  const toggleSpecialization = (spec: string) => {
    setSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  };

  const addCertification = () => {
    setCertifications((prev) => [...prev, { name: '', org: '' }]);
  };

  const removeCertification = (index: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCert = (index: number, field: 'name' | 'org', value: string) => {
    setCertifications((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const canContinueStep0 = hasSettledPlan || planId !== '';
  const canContinueStep1 = sports.length > 0;
  const canContinueStep2 = experience !== '';
  const canContinueStep3 = teamName.trim().length > 0 && ageGroup !== '';

  const handleContinue = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  /** Persists the answers to the Go API. The onboarding is not optional. */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');

    const payload = {
      sports,
      specializations,
      experience_level: experience,
      team_name: teamName.trim(),
      team_size: teamSize,
      age_group: ageGroup,
      certifications: certifications
        .filter((c) => c.name.trim() || c.org.trim())
        .map((c) => ({ name: c.name.trim(), org: c.org.trim() })),
    };

    try {
      const res = await fetch('/api/coach/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'No se pudo guardar tu perfil');
      }

      onComplete({
        planId,
        sports,
        specializations,
        experience,
        teamName: teamName.trim(),
        teamSize,
        ageGroup,
        certifications: payload.certifications,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar tu perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const filledCertifications = certifications.filter((c) => c.name.trim() || c.org.trim());

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-caption text-text-secondary" aria-live="polite">
          Paso {currentStep + 1} de {STEPS.length} · {STEPS[currentStep]?.description}
        </p>
        <OnboardingStepper steps={STEPS} currentStep={currentStep} />
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">Tu plan</h2>
              <p className="text-body-sm text-text-secondary">
                {hasSettledPlan
                  ? 'Este es el plan que activaste con tu pago.'
                  : 'Selecciona el plan que mejor se adapte a tus necesidades'}
              </p>
            </div>

            {hasSettledPlan ? (
              <PlanSummaryCard plan={paidPlan} paid />
            ) : plansLoading ? (
              <div className="text-center py-12 text-text-secondary">Cargando planes...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const selected = planId === plan.id;
                  const priceUSD = plan.currency === 'USD' ? plan.price : Math.round(plan.price / (plan.trm || 4120));
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPlanId(plan.id)}
                      className={cn(
                        'relative flex flex-col rounded-xl border p-6 text-left transition-all duration-200',
                        selected
                          ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary'
                          : 'border-surface-6 bg-surface-2 hover:border-surface-5 hover:bg-surface-3',
                      )}
                    >
                      <div className="flex flex-col items-center text-center mb-4">
                        <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-bold text-brand-primary">${priceUSD}</span>
                          <span className="text-sm text-text-secondary">/{plan.billing_period}</span>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-6 flex-1">
                        <li className="flex items-center gap-2 text-sm text-text-secondary">
                          <Check className="h-4 w-4 text-brand-primary shrink-0" aria-hidden="true" />
                          <span>Hasta {plan.max_athletes} atletas</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm text-text-secondary">
                          <Check className="h-4 w-4 text-brand-primary shrink-0" aria-hidden="true" />
                          <span>{plan.max_sessions_per_week} sesiones/semana</span>
                        </li>
                      </ul>
                      <div
                        className={cn(
                          'w-full py-3 rounded-lg font-semibold text-sm transition-colors text-center',
                          selected
                            ? 'bg-brand-primary text-white'
                            : 'bg-transparent text-brand-primary border border-brand-primary hover:bg-brand-primary/10',
                        )}
                      >
                        {selected ? 'Seleccionado' : 'Elegir este plan'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {saveError && (
              <p className="text-body-sm text-error" role="alert">
                {saveError}
              </p>
            )}

            <button
              type="button"
              disabled={!canContinueStep0 || paidPlanLoading}
              onClick={handleContinue}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                'bg-brand-primary text-white',
                'hover:bg-brand-primary-hover active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              Continuar
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">
                ¿Qué deportes entrenas?
              </h2>
              <p className="text-body-sm text-text-secondary">
                Selecciona todos los que apliquen
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Deportes">
              {SPORTS.map((sport) => {
                const selected = sports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSport(sport)}
                    className={cn(
                      'rounded-md border px-4 py-2 text-body-sm font-medium transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                      selected
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-surface-6 bg-surface-2 text-text-secondary hover:border-surface-5 hover:text-text-primary',
                    )}
                  >
                    {sport}
                  </button>
                );
              })}
            </div>

            <div>
              <h3 className="text-h4 font-display text-text-primary mb-3 mt-2">
                Especialización
              </h3>
              <div className="flex flex-col gap-3" role="group" aria-label="Especializaciones">
                {SPECIALIZATIONS.map((spec) => {
                  const selected = specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSpecialization(spec)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-left transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                        selected
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-surface-6 bg-surface-2 hover:border-surface-5',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200',
                          selected
                            ? 'border-brand-primary bg-brand-primary'
                            : 'border-surface-6 bg-surface-0',
                        )}
                        aria-hidden="true"
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="text-body-sm text-text-primary">{spec}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!canContinueStep1}
                onClick={handleContinue}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                  'bg-brand-primary text-white',
                  'hover:bg-brand-primary-hover active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Continuar
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">
                ¿Cuál es tu nivel de experiencia?
              </h2>
              <p className="text-body-sm text-text-secondary">
                Selecciona tu experiencia como coach
              </p>
            </div>

            <div className="flex flex-col gap-3" role="radiogroup" aria-label="Nivel de experiencia">
              {EXPERIENCE_LEVELS.map((level) => {
                const selected = experience === level.id;
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setExperience(level.id)}
                    className={cn(
                      'flex items-start gap-4 rounded-lg border p-4 text-left transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                      selected ? 'border-brand-primary' : 'border-surface-6 bg-surface-2 hover:border-surface-5',
                      'glass-card',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                        selected ? 'bg-brand-primary/10 text-brand-primary' : 'bg-surface-3 text-text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          'text-body-sm font-semibold',
                          selected ? 'text-brand-primary' : 'text-text-primary',
                        )}
                      >
                        {level.title}
                      </p>
                      <p className="text-caption text-text-secondary mt-0.5">
                        {level.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                        selected ? 'border-brand-primary' : 'border-surface-6',
                      )}
                      aria-hidden="true"
                    >
                      {selected && <div className="h-2.5 w-2.5 rounded-full bg-brand-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!canContinueStep2}
                onClick={handleContinue}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                  'bg-brand-primary text-white',
                  'hover:bg-brand-primary-hover active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Continuar
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">
                Cuéntanos sobre tu equipo
              </h2>
              <p className="text-body-sm text-text-secondary">
                Configura tu equipo por defecto
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="team-name"
                  className="text-caption font-semibold text-text-primary uppercase tracking-wider"
                >
                  Nombre del equipo
                </label>
                <input
                  id="team-name"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej. Águilas, Titanes o el nombre de tu programa"
                  className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 px-4 text-body-sm text-text-primary placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Tamaño del equipo
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Quitar un atleta"
                    onClick={() => setTeamSize((prev) => Math.max(1, prev - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="flex h-12 flex-1 items-center justify-center rounded-md border border-surface-6 bg-surface-2 px-4">
                    <span className="text-body font-semibold text-text-primary">{teamSize}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Añadir un atleta"
                    onClick={() => setTeamSize((prev) => Math.min(999, prev + 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Grupo etario
                </span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Grupo etario">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group}
                      type="button"
                      aria-pressed={ageGroup === group}
                      onClick={() => setAgeGroup(group)}
                      className={cn(
                        'flex h-12 items-center justify-center rounded-md border text-body-sm font-medium transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                        ageGroup === group
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-surface-6 bg-surface-2 text-text-secondary hover:border-surface-5 hover:text-text-primary',
                      )}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!canContinueStep3}
                onClick={handleContinue}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                  'bg-brand-primary text-white',
                  'hover:bg-brand-primary-hover active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Continuar
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">
                Tus certificaciones
              </h2>
              <p className="text-body-sm text-text-secondary">
                Agrega tus credenciales (opcional)
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className="relative rounded-md border border-surface-6 bg-surface-2 p-4"
                >
                  {certifications.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Quitar certificación ${index + 1}`}
                      onClick={() => removeCertification(index)}
                      className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:text-error transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`cert-name-${index}`}
                        className="text-caption font-semibold text-text-primary uppercase tracking-wider"
                      >
                        Nombre de la certificación
                      </label>
                      <input
                        id={`cert-name-${index}`}
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCert(index, 'name', e.target.value)}
                        placeholder="Ej. CSCS, USATF Nivel 1 o N/A"
                        className="h-12 w-full rounded-md border border-surface-6 bg-surface-0 px-4 text-body-sm text-text-primary placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`cert-org-${index}`}
                        className="text-caption font-semibold text-text-primary uppercase tracking-wider"
                      >
                        Organización emisora
                      </label>
                      <input
                        id={`cert-org-${index}`}
                        type="text"
                        value={cert.org}
                        onChange={(e) => updateCert(index, 'org', e.target.value)}
                        placeholder="Ej. NSCA, USATF o N/A"
                        className="h-12 w-full rounded-md border border-surface-6 bg-surface-0 px-4 text-body-sm text-text-primary placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCertification}
              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-surface-6 bg-transparent py-3 text-body-sm font-medium text-brand-primary hover:border-brand-primary/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar otra certificación
            </button>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleContinue}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200 bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-[0.98]"
              >
                Continuar
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                Volver
              </button>
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-body-sm text-text-secondary hover:text-text-primary transition-colors text-center"
                >
                  Saltar por ahora
                </button>
              )}
            </div>
          </motion.div>
        )}

        {currentStep === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-h4 font-display text-text-primary mb-1">
                Revisa tu perfil antes de guardar
              </h2>
              <p className="text-body-sm text-text-secondary">
                Confirmá que todo está correcto. Podés volver atrás para editarlo.
              </p>
            </div>

            <dl className="flex flex-col gap-3">
              {paidPlan && (
                <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                  <dt className="text-caption uppercase tracking-wider text-text-secondary">Plan</dt>
                  <dd className="text-body-sm text-text-primary">{paidPlan.name}</dd>
                </div>
              )}
              <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                <dt className="text-caption uppercase tracking-wider text-text-secondary">Deportes</dt>
                <dd className="text-body-sm text-text-primary">{sports.join(', ')}</dd>
              </div>
              <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                <dt className="text-caption uppercase tracking-wider text-text-secondary">
                  Especialización
                </dt>
                <dd className="text-body-sm text-text-primary">
                  {specializations.length > 0 ? specializations.join(', ') : 'Sin especificar'}
                </dd>
              </div>
              <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                <dt className="text-caption uppercase tracking-wider text-text-secondary">
                  Experiencia
                </dt>
                <dd className="text-body-sm text-text-primary">
                  {EXPERIENCE_LABELS[experience] ?? experience}
                </dd>
              </div>
              <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                <dt className="text-caption uppercase tracking-wider text-text-secondary">Equipo</dt>
                <dd className="text-body-sm text-text-primary">
                  {teamName} · {teamSize} atletas · {ageGroup}
                </dd>
              </div>
              <div className="rounded-md border border-surface-6 bg-surface-2 p-3">
                <dt className="text-caption uppercase tracking-wider text-text-secondary">
                  Certificaciones
                </dt>
                <dd className="text-body-sm text-text-primary">
                  {filledCertifications.length > 0
                    ? filledCertifications
                        .map((c) => (c.org.trim() ? `${c.name.trim()} (${c.org.trim()})` : c.name.trim()))
                        .join(', ')
                    : 'Sin certificaciones'}
                </dd>
              </div>
            </dl>

            {saveError && (
              <p className="text-body-sm text-error" role="alert">
                {saveError}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                  'bg-brand-primary text-white',
                  'hover:bg-brand-primary-hover active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-5 w-5" aria-hidden="true" />
                )}
                Guardar perfil
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary disabled:opacity-50"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

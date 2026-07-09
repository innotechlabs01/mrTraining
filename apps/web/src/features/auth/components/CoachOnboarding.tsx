'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStepper } from './OnboardingStepper';

interface Certification {
  name: string;
  org: string;
}

interface CoachOnboardingProps {
  onComplete: (data: CoachOnboardingData) => void;
  onSkip?: () => void;
}

interface CoachOnboardingData {
  sports: string[];
  specializations: string[];
  experience: string;
  teamName: string;
  teamSize: number;
  ageGroup: string;
  certifications: { name: string; org: string }[];
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
    title: 'Beginner (0-2 years)',
    description: 'New to coaching, building foundational experience',
    icon: Dumbbell,
  },
  {
    id: 'intermediate',
    title: 'Intermediate (3-5 years)',
    description: 'Experienced coach with a growing track record',
    icon: Zap,
  },
  {
    id: 'advanced',
    title: 'Advanced (6-10 years)',
    description: 'Seasoned coach with proven results',
    icon: Users,
  },
  {
    id: 'elite',
    title: 'Elite (10+ years)',
    description: 'Top-tier coach at the peak of the profession',
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

const STEPS = [
  { id: 'sport', title: 'Sport', description: 'Sport & specialization' },
  { id: 'experience', title: 'Experience', description: 'Your experience level' },
  { id: 'team', title: 'Team', description: 'Team details' },
  { id: 'certifications', title: 'Certifications', description: 'Your credentials' },
];

export function CoachOnboarding({ onComplete, onSkip }: CoachOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [sports, setSports] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(1);
  const [ageGroup, setAgeGroup] = useState('');
  const [certifications, setCertifications] = useState<Certification[]>([{ name: '', org: '' }]);

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

  const canContinueStep0 = sports.length > 0;
  const canContinueStep1 = experience !== '';
  const canContinueStep2 = teamName.trim().length > 0 && ageGroup !== '';

  const handleContinue = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleComplete = () => {
    onComplete({
      sports,
      specializations,
      experience,
      teamName: teamName.trim(),
      teamSize,
      ageGroup,
      certifications: certifications.filter((c) => c.name.trim() || c.org.trim()),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <OnboardingStepper steps={STEPS} currentStep={currentStep} />

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
              <h2 className="text-h4 font-display text-text-primary mb-1">
                What sports do you coach?
              </h2>
              <p className="text-body-sm text-text-secondary">
                Select all that apply
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SPORTS.map((sport) => {
                const selected = sports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={cn(
                      'rounded-md border px-4 py-2 text-body-sm font-medium transition-all duration-200',
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
                Specializations
              </h3>
              <div className="flex flex-col gap-3">
                {SPECIALIZATIONS.map((spec) => {
                  const selected = specializations.includes(spec);
                  return (
                    <label
                      key={spec}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-all duration-200',
                        selected
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-surface-6 bg-surface-2 hover:border-surface-5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200',
                          selected
                            ? 'border-brand-primary bg-brand-primary'
                            : 'border-surface-6 bg-surface-0',
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-body-sm text-text-primary">{spec}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={!canContinueStep0}
              onClick={handleContinue}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                'bg-brand-primary text-white',
                'hover:bg-brand-primary-hover active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
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
                What is your experience level?
              </h2>
              <p className="text-body-sm text-text-secondary">
                Select your coaching experience
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {EXPERIENCE_LEVELS.map((level) => {
                const selected = experience === level.id;
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setExperience(level.id)}
                    className={cn(
                      'flex items-start gap-4 rounded-lg border p-4 text-left transition-all duration-200',
                      selected
                        ? 'border-brand-primary'
                        : 'border-surface-6 bg-surface-2 hover:border-surface-5',
                      'glass-card',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                        selected ? 'bg-brand-primary/10 text-brand-primary' : 'bg-surface-3 text-text-secondary',
                      )}
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
                        selected
                          ? 'border-brand-primary'
                          : 'border-surface-6',
                      )}
                    >
                      {selected && <div className="h-2.5 w-2.5 rounded-full bg-brand-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>

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
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
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
                Tell us about your team
              </h2>
              <p className="text-body-sm text-text-secondary">
                Set up your default team profile
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Eagles, Titans, or your program name"
                  className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Team Size
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTeamSize((prev) => Math.max(1, prev - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-12 flex-1 items-center justify-center rounded-md border border-surface-6 bg-surface-2 px-4">
                    <span className="text-body font-semibold text-white">{teamSize}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTeamSize((prev) => Math.min(999, prev + 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Age Group
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setAgeGroup(group)}
                      className={cn(
                        'flex h-12 items-center justify-center rounded-md border text-body-sm font-medium transition-all duration-200',
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
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
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
                Your Certifications
              </h2>
              <p className="text-body-sm text-text-secondary">
                Add your coaching credentials (optional)
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
                      onClick={() => removeCertification(index)}
                      className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:text-error transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                        Certification Name
                      </label>
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCert(index, 'name', e.target.value)}
                        placeholder="e.g. CSCS, USATF Level 1, or N/A"
                        className="h-12 w-full rounded-md border border-surface-6 bg-surface-0 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                        Issuing Organization
                      </label>
                      <input
                        type="text"
                        value={cert.org}
                        onChange={(e) => updateCert(index, 'org', e.target.value)}
                        placeholder="e.g. NSCA, USATF, or N/A"
                        className="h-12 w-full rounded-md border border-surface-6 bg-surface-0 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCertification}
              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-surface-6 bg-transparent py-3 text-body-sm font-medium text-brand-primary hover:border-brand-primary/40 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Add Another Certification
            </button>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleComplete}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                  'bg-brand-primary text-white',
                  'hover:bg-brand-primary-hover active:scale-[0.98]',
                )}
              >
                Complete Setup
                <ChevronRight className="h-4 w-4" />
              </button>

              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-body-sm text-text-secondary hover:text-text-primary transition-colors text-center"
                >
                  Skip for now
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

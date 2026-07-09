'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStepper } from './OnboardingStepper';

interface AthleteOnboardingProps {
  onComplete: (data: AthleteOnboardingData) => void;
  onSkip?: () => void;
}

interface AthleteOnboardingData {
  sport: string;
  position: string;
  team: string;
  experience: number;
  goals: string[];
  coachCode: string;
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

const GOALS = [
  'Improve Speed',
  'Build Strength',
  'Increase Endurance',
  'Skill Mastery',
  'Injury Recovery',
  'Competition Prep',
  'Weight Management',
  'General Fitness',
];

const STEPS = [
  { id: 'sport', title: 'Sport', description: 'Choose your primary sport' },
  { id: 'profile', title: 'Profile', description: 'Athlete details & goals' },
  { id: 'coach', title: 'Coach', description: 'Connect with your coach' },
];

export function AthleteOnboarding({ onComplete, onSkip }: AthleteOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [sport, setSport] = useState('');
  const [position, setPosition] = useState('');
  const [team, setTeam] = useState('');
  const [experience, setExperience] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [coachCode, setCoachCode] = useState('');

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const canContinueStep0 = sport !== '';
  const canContinueStep1 = position.trim().length > 0 || team.trim().length > 0 || goals.length > 0;

  const handleContinue = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleComplete = () => {
    onComplete({
      sport,
      position: position.trim(),
      team: team.trim(),
      experience,
      goals,
      coachCode: coachCode.trim(),
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
                What is your primary sport?
              </h2>
              <p className="text-body-sm text-text-secondary">
                Select the sport you train for
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SPORTS.map((s) => {
                const selected = sport === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSport(s)}
                    className={cn(
                      'flex h-20 items-center justify-center rounded-lg border text-body-sm font-semibold transition-all duration-200',
                      selected
                        ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                        : 'border-surface-6 bg-surface-2 text-text-secondary hover:border-surface-5 hover:text-text-primary',
                    )}
                  >
                    {selected && (
                      <Check className="mr-2 h-4 w-4 shrink-0" />
                    )}
                    {s}
                  </button>
                );
              })}
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
                Tell us about yourself
              </h2>
              <p className="text-body-sm text-text-secondary">
                Help us personalize your training
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                    Position/Role
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Quarterback, Forward"
                    className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                    Team/Club Name
                  </label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="e.g. Westside High"
                    className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Years of Experience
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExperience((prev) => Math.max(0, prev - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-12 flex-1 items-center justify-center rounded-md border border-surface-6 bg-surface-2 px-4">
                    <span className="text-body font-semibold text-white">{experience}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExperience((prev) => Math.min(99, prev + 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-md border border-surface-6 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-surface-5 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Your Goals
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((goal) => {
                    const selected = goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={cn(
                          'rounded-md border px-3 py-2 text-caption font-medium transition-all duration-200',
                          selected
                            ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                            : 'border-surface-6 bg-surface-2 text-text-secondary hover:border-surface-5 hover:text-text-primary',
                        )}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                Connect with your coach
              </h2>
              <p className="text-body-sm text-text-secondary">
                Optional — link your account to your coach
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-caption font-semibold text-text-primary uppercase tracking-wider">
                  Coach&apos;s Email or Code
                </label>
                <input
                  type="text"
                  value={coachCode}
                  onChange={(e) => setCoachCode(e.target.value)}
                  placeholder="Enter their connect code or email"
                  className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 px-4 text-body-sm text-white placeholder-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200"
                />
                <p className="text-caption text-text-secondary mt-1">
                  Ask your coach for their connect code or email
                </p>
              </div>
            </div>

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

              <button
                type="button"
                onClick={handleComplete}
                className="text-body-sm text-text-secondary hover:text-text-primary transition-colors text-center"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

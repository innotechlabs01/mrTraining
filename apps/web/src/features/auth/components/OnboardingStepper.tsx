'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  currentStep: number;
  className?: string;
}

export function OnboardingStepper({ steps, currentStep, className }: OnboardingStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
                <div
                  className={cn(
                    'absolute top-4 right-1/2 h-px w-full -translate-y-1/2',
                    isCompleted || isCurrent ? 'bg-brand-primary' : 'bg-surface-6',
                  )}
                  style={{ zIndex: 0 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
                    isCompleted && 'bg-brand-primary',
                    isCurrent && 'border-2 border-brand-primary bg-surface-0 shadow-[0_0_12px_rgba(255,107,0,0.4)]',
                    isFuture && 'border-2 border-surface-6 bg-surface-2',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <span
                      className={cn(
                        'text-caption font-semibold',
                        isCurrent && 'text-brand-primary',
                        isFuture && 'text-text-secondary',
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="mt-2 hidden md:block text-center">
                  <p
                    className={cn(
                      'text-caption font-medium',
                      isCompleted && 'text-brand-primary',
                      isCurrent && 'text-text-primary',
                      isFuture && 'text-text-secondary',
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] text-text-secondary leading-tight mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

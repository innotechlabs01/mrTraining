'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Brain, Loader2, CheckCircle2, RefreshCw, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAI } from '../../hooks/useAI';
import type { AiProgramParams, AiGeneratedProgram } from '../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FOCUS_OPTIONS = ['strength', 'endurance', 'speed', 'mixed'] as const;
const INTENSITY_OPTIONS = ['low', 'medium', 'high'] as const;

interface AiGenerationModalProps {
  onClose: () => void;
  onApply: (program: AiGeneratedProgram) => void;
}

export default function AiGenerationModal({ onClose, onApply }: AiGenerationModalProps) {
  const { generateProgram } = useAI();

  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [focus, setFocus] = useState<AiProgramParams['focus']>('mixed');
  const [intensity, setIntensity] = useState<AiProgramParams['intensity']>('medium');
  const [duration, setDuration] = useState(45);
  const [generating, setGenerating] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<AiGeneratedProgram | null>(null);

  const toggleDay = useCallback((day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedDays.length === 0) return;
    setGenerating(true);
    setGeneratedProgram(null);
    try {
      const result = await generateProgram({
        days: selectedDays,
        focus,
        intensity,
        duration,
      });
      setGeneratedProgram(result);
    } finally {
      setGenerating(false);
    }
  }, [selectedDays, focus, intensity, duration, generateProgram]);

  const handleApply = useCallback(() => {
    if (generatedProgram) onApply(generatedProgram);
  }, [generatedProgram, onApply]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleOverlayClick}
      >
        <motion.div
          className={cn(
            'relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl',
            'bg-surface-1 border border-white/10 shadow-2xl',
          )}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface-1 px-6 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <h2 className="text-lg font-semibold text-white">AI Program Generator</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-surface-3 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            {!generatedProgram && !generating && (
              <>
                <section>
                  <label className="mb-2 block text-sm font-medium text-secondary">
                    Training Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                          selectedDays.includes(day)
                            ? 'bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20'
                            : 'bg-surface-3 text-secondary hover:bg-surface-4 hover:text-white',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="mb-2 block text-sm font-medium text-secondary">
                    Focus Area
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFocus(opt)}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all duration-200',
                          focus === opt
                            ? 'bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20'
                            : 'bg-surface-3 text-secondary hover:bg-surface-4 hover:text-white',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="mb-2 block text-sm font-medium text-secondary">
                    Intensity
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTENSITY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIntensity(opt)}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all duration-200',
                          intensity === opt
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                            : 'bg-surface-3 text-secondary hover:bg-surface-4 hover:text-white',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label
                    htmlFor="duration-input"
                    className="mb-2 block text-sm font-medium text-secondary"
                  >
                    Session Duration (minutes)
                  </label>
                  <input
                    id="duration-input"
                    type="number"
                    min={15}
                    max={180}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(15, Math.min(180, Number(e.target.value))))}
                    className={cn(
                      'w-32 rounded-lg border border-white/10 bg-surface-3 px-4 py-2 text-sm text-white',
                      'focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary',
                      'transition-all duration-200',
                    )}
                  />
                </section>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={selectedDays.length === 0}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white',
                    'bg-brand-secondary hover:bg-brand-secondary/90',
                    'transition-all duration-200',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Program
                </button>
              </>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{ boxShadow: ['0 0 0px rgba(255,107,0,0)', '0 0 30px rgba(255,107,0,0.3)', '0 0 0px rgba(255,107,0,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <p className="text-sm font-medium text-white">Generating your program...</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  AI is designing {selectedDays.length}-day {focus} program
                </p>
              </div>
            )}

            {generatedProgram && !generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-white">Program Generated</span>
                  <span className="rounded bg-brand-primary/15 px-2 py-0.5 text-xs font-medium text-brand-primary">
                    {focus} · {intensity}
                  </span>
                </div>

                <div className="space-y-4">
                  {generatedProgram.sessions.map((session) => (
                    <div key={session.day} className="rounded-lg bg-surface-2 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-white">{session.day}</h4>
                      <div className="space-y-2">
                        {session.exercises.map((ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between rounded-md bg-surface-3 px-3 py-2"
                          >
                            <span className="text-sm text-white">{ex.name}</span>
                            <span className="text-xs text-[#6B7280]">
                              {ex.sets}×{ex.reps} @ {ex.rest}s
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card rounded-lg p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-brand-primary" />
                    <span className="text-xs font-semibold text-brand-primary">AI REASONING</span>
                  </div>
                  <p className="text-sm text-secondary">{generatedProgram.reasoning}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApply}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white',
                      'bg-brand-primary hover:bg-brand-primary-hover',
                      'transition-all duration-200',
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Program
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-secondary',
                      'bg-surface-3 hover:bg-surface-4 hover:text-white',
                      'transition-all duration-200',
                    )}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-secondary',
                      'hover:text-white',
                      'transition-all duration-200',
                    )}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Manually
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

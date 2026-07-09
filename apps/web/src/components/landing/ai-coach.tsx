'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { Sparkles, Brain, ShieldCheck, TrendingUp } from 'lucide-react';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const aiFeatures = [
  {
    icon: Sparkles,
    title: 'Program Generation',
    description: 'Describe your session. AI builds a complete draft. You review, tweak, and publish.',
  },
  {
    icon: Brain,
    title: 'Nutrition Planning',
    description: 'Context-aware meal plans aligned to training phase, dietary needs, and goals.',
  },
  {
    icon: TrendingUp,
    title: 'Anomaly Detection',
    description: 'AI flags what needs attention — missed sessions, HRV decline, injury risk — before it becomes a problem.',
  },
  {
    icon: ShieldCheck,
    title: 'Always in Control',
    description: 'AI proposes. You decide. Every suggestion is explainable. Nothing is published without approval.',
  },
];

function AIDemo() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [lines, setLines] = useState<string[]>([]);

  const fullLines = [
    '> Analyzing athlete data...',
    '> Training load: +18% this week',
    '> HRV: -12% over 5 days',
    '> Sleep: 6.2h avg (below baseline)',
    '',
    '> RECOMMENDATION:',
    '> Reduce squat volume by 15%',
    '> Add one recovery day this week',
    '> Increase carbohydrate intake',
    '> on training days.',
    '',
    '> Confidence: 87%',
    '> Reason: This load/recovery pattern',
    '> preceded overtraining in 73% of',
    '> similar cases.',
  ];

  useEffect(() => {
    if (!isInView) return;
    let charIndex = 0;
    let lineIndex = 0;
    let currentLine = '';

    const interval = setInterval(() => {
      if (lineIndex >= fullLines.length) {
        clearInterval(interval);
        return;
      }
      if (charIndex >= fullLines[lineIndex].length) {
        setLines(prev => [...prev, currentLine]);
        currentLine = '';
        charIndex = 0;
        lineIndex++;
      } else {
        currentLine += fullLines[lineIndex][charIndex];
        charIndex++;
        setLines(prev => {
          const copy = [...prev];
          if (copy.length <= lineIndex) {
            copy.push(currentLine);
          } else {
            copy[lineIndex] = currentLine;
          }
          return copy;
        });
      }
    }, 35);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={ref} className="relative rounded-lg bg-surface-1 border border-surface-6 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-surface-6">
        <div className="w-3 h-3 rounded-full bg-error/60" />
        <div className="w-3 h-3 rounded-full bg-warning/60" />
        <div className="w-3 h-3 rounded-full bg-success/60" />
        <span className="ml-2 text-caption text-text-tertiary font-mono">mrtraining ~ ai/analyze</span>
      </div>
      {/* Terminal body */}
      <div className="p-5 font-mono text-body-sm leading-relaxed min-h-[340px]">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={
              line.startsWith('> RECOMMENDATION') ? 'text-brand-primary mt-2' :
              line.startsWith('> Confidence') ? 'text-success mt-2' :
              line.startsWith('> Reason') ? 'text-text-tertiary mt-1 text-caption' :
              line.startsWith('>') ? 'text-text-secondary' :
              'text-text-tertiary'
            }
          >
            {line}
            {i === lines.length - 1 && i < fullLines.length && (
              <span className="inline-block w-2 h-4 bg-brand-primary ml-0.5 animate-pulse" />
            )}
          </motion.div>
        ))}
        {lines.length === 0 && (
          <span className="inline-block w-2 h-4 bg-brand-primary animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function AICoachSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      {/* Subtle tech pattern background */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,102,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Text column */}
          <SectionReveal>
            <FadeInView>
              <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-6">
                Meet Your AI Teammate
              </p>
            </FadeInView>
            <FadeInView delay={0.1}>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-8">
                AI that coaches with you, not instead of&nbsp;you.
              </h2>
            </FadeInView>

            <div className="space-y-5">
              {aiFeatures.map((feature, i) => (
                <FadeInView key={feature.title} delay={0.2 + i * 0.1}>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-sm bg-brand-secondary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-brand-secondary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-body text-text-primary mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-body-sm text-text-secondary">{feature.description}</p>
                    </div>
                  </div>
                </FadeInView>
              ))}
            </div>

            <FadeInView delay={0.6}>
              <a
                href="#features"
                className="inline-flex items-center gap-2 mt-8 text-body font-medium text-brand-secondary hover:text-brand-secondary-hover transition-colors"
              >
                Explore AI Features
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </FadeInView>
          </SectionReveal>

          {/* Demo column */}
          <FadeInView direction="left" delay={0.3}>
            <AIDemo />
          </FadeInView>
        </div>
      </div>
    </section>
  );
}

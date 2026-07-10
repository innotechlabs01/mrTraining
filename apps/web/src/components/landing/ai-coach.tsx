'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { Sparkles, Brain, ShieldCheck, TrendingUp } from 'lucide-react';
import { useInView } from 'framer-motion';
import { useLang } from './i18n';

const aiFeatures = [
  {
    icon: Sparkles,
    titleEs: 'Generación de programas',
    titleEn: 'Program Generation',
    descEs: 'Describe tu sesión. La IA arma un borrador completo. Revisas, ajustas y publicas.',
    descEn: 'Describe your session. AI builds a complete draft. You review, tweak, and publish.',
  },
  {
    icon: Brain,
    titleEs: 'Plan nutricional',
    titleEn: 'Nutrition Planning',
    descEs: 'Planes de comidas adaptados a la fase de entrenamiento, necesidades y objetivos.',
    descEn: 'Context-aware meal plans aligned to training phase, dietary needs, and goals.',
  },
  {
    icon: TrendingUp,
    titleEs: 'Detección de anomalías',
    titleEn: 'Anomaly Detection',
    descEs: 'La IA detecta lo que necesita atención — sesiones perdidas, caída de HRV, riesgo de lesión.',
    descEn: 'AI flags what needs attention — missed sessions, HRV decline, injury risk — before it becomes a problem.',
  },
  {
    icon: ShieldCheck,
    titleEs: 'Siempre al mando',
    titleEn: 'Always in Control',
    descEs: 'La IA propone. Tú decides. Cada sugerencia es explicable. Nada se publica sin tu aprobación.',
    descEn: 'AI proposes. You decide. Every suggestion is explainable. Nothing is published without approval.',
  },
];

const esDemoLines = [
  '> Analizando datos del atleta...',
  '> Carga de entrenamiento: +18% esta semana',
  '> VFC: -12% en 5 días',
  '> Sueño: 6.2h promedio (debajo del basal)',
  '',
  '> RECOMENDACIÓN:',
  '> Reducir volumen de sentadillas 15%',
  '> Agregar un día de recuperación',
  '> Aumentar ingesta de carbohidratos',
  '> en días de entrenamiento.',
  '',
  '> Confianza: 87%',
  '> Motivo: Este patrón de carga/recuperación',
  '> precedió sobreentrenamiento en el 73%',
  '> de casos similares.',
];

const enDemoLines = [
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

function AIDemo() {
  const { es } = useLang();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [lines, setLines] = useState<string[]>([]);
  const fullLines = es ? esDemoLines : enDemoLines;

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
  }, [isInView, es]);

  return (
    <div ref={ref} className="relative rounded-lg bg-surface-1 border border-surface-6 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-surface-6">
        <div className="w-3 h-3 rounded-full bg-error/60" />
        <div className="w-3 h-3 rounded-full bg-warning/60" />
        <div className="w-3 h-3 rounded-full bg-success/60" />
        <span className="ml-2 text-caption text-text-tertiary font-mono">mrtraining ~ ai/analyze</span>
      </div>
      <div className="p-5 font-mono text-body-sm leading-relaxed min-h-[340px]">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={
              line.startsWith('> RECOMENDACIÓN') || line.startsWith('> RECOMMENDATION') ? 'text-brand-primary mt-2' :
              line.startsWith('> Confianza') || line.startsWith('> Confidence') ? 'text-success mt-2' :
              line.startsWith('> Motivo') || line.startsWith('> Reason') ? 'text-text-tertiary mt-1 text-caption' :
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
  const { txt } = useLang();
  return (
    <section className="relative py-24 lg:py-32 bg-surface-1 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,102,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <SectionReveal>
            <FadeInView>
              <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-6">
                {txt('Conoce a tu asistente IA', 'Meet Your AI Teammate')}
              </p>
            </FadeInView>
            <FadeInView delay={0.1}>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-8">
                {txt('IA que entrena contigo, no en tu lugar.', 'AI that coaches with you, not instead of you.')}
              </h2>
            </FadeInView>

            <div className="space-y-5">
              {aiFeatures.map((feature, i) => (
                <FadeInView key={feature.titleEn} delay={0.2 + i * 0.1}>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-sm bg-brand-secondary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-brand-secondary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-body text-text-primary mb-1">
                        {txt(feature.titleEs, feature.titleEn)}
                      </h4>
                      <p className="text-body-sm text-text-secondary">{txt(feature.descEs, feature.descEn)}</p>
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
                {txt('Explorar funciones IA', 'Explore AI Features')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </FadeInView>
          </SectionReveal>

          <FadeInView direction="left" delay={0.3}>
            <AIDemo />
          </FadeInView>
        </div>
      </div>
    </section>
  );
}

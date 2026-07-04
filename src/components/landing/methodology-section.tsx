import { GlassCard, SectionHeading } from '@/components/shared';

const METHODS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-velocity-blue">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 5-5" />
      </svg>
    ),
    title: 'Bio-Metric Telemetry',
    description:
      'Precision data tracking using advanced wearable integration. We monitor HRV, metabolic markers, and recovery cycles to pivot your training in real-time.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-velocity-blue">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 3.13a4 4 0 010 7.75" />
        <path d="M21 21v-2a4 4 0 00-3-3.85" />
      </svg>
    ),
    title: 'Hybrid Coaching',
    description:
      'A seamless blend of elite digital programming and 1-on-1 performance consultation. Expert guidance accessible wherever your training takes you.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-velocity-blue">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    title: 'Precision Nutrition',
    description:
      'Algorithmically adjusted fuel plans that evolve with your workload. No generic diets—only fuel engineered for your specific physiological demands.',
  },
];

export function MethodologySection() {
  return (
    <section className="py-section-gap-lg bg-background" id="method">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter">
        <SectionHeading title="The Methodology" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {METHODS.map((method) => (
            <GlassCard key={method.title}>
              <div className="w-16 h-16 bg-velocity-blue/10 flex items-center justify-center rounded-full mb-8 group-hover:scale-110 transition-transform">
                {method.icon}
              </div>
              <h3 className="font-headline-md text-2xl font-bold uppercase mb-4">{method.title}</h3>
              <p className="text-muted-gray leading-relaxed">{method.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

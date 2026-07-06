import { SectionHeading } from '@/components/shared';

const TECH_FEATURES = [
  {
    icon: 'sync' as const,
    title: 'Real-time Monitoring',
    description: "Live telemetry from your sensors to your coach's dashboard.",
  },
  {
    icon: 'psychology' as const,
    title: 'Neural Analysis',
    description: 'Measuring mental fatigue and focus scores during key sessions.',
  },
  {
    icon: 'biotech' as const,
    title: 'Lactate Logic',
    description: 'Precision programming based on threshold and fuel utilization.',
  },
  {
    icon: 'hub' as const,
    title: 'Universal Sync',
    description: 'Centralized data from over 50+ fitness hardware integrations.',
  },
] as const;

export function TechAdvantage() {
  return (
    <section className="py-[120px] bg-[#1C1C1C]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <SectionHeading
          title="The Apex Tech Advantage"
          subtitle="Driven by Data, Proven by Science."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {TECH_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#0F0F0F] border border-[#2C2C2C]/50 rounded-xl p-8 text-center hover:border-[#0066FF]/50 transition-all duration-500"
            >
              <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0066FF"
                  strokeWidth="1.5"
                >
                  {feature.icon === 'sync' && (
                    <>
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
                    </>
                  )}
                  {feature.icon === 'psychology' && (
                    <>
                      <path d="M12 2a10 10 0 0110 10c0 2.5-1 5-3 6.5V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-1.5C3 17 2 14.5 2 12A10 10 0 0112 2z" />
                      <path d="M8 10h.01" />
                      <path d="M16 10h.01" />
                      <path d="M10 14h4" />
                    </>
                  )}
                  {feature.icon === 'biotech' && (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </>
                  )}
                  {feature.icon === 'hub' && (
                    <>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 4.6a10 10 0 010 14.8" />
                      <path d="M4.6 4.6a10 10 0 000 14.8" />
                    </>
                  )}
                </svg>
              </div>
              <h3 className="font-headline-md text-lg font-bold uppercase mb-3">
                {feature.title}
              </h3>
              <p className="text-[#C4C7C7] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

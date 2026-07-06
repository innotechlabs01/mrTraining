import { SectionHeading } from '@/components/shared';

const STEPS = [
  {
    number: '01',
    title: 'Assessment',
    description: 'DNA sequencing, gait analysis, and baseline metabolic performance testing.',
  },
  {
    number: '02',
    title: 'The Plan',
    description:
      'Custom algorithms generate your hyper-personalized training & nutrition macro-cycle.',
  },
  {
    number: '03',
    title: 'Execution',
    description: 'Daily workouts delivered via app with live bio-feedback coaching sessions.',
  },
  {
    number: '04',
    title: 'Community',
    description: 'Join high-performance squads for regional races and social challenges.',
  },
  {
    number: '05',
    title: 'Results',
    description: 'Measurable upgrades in VO2 Max, strength-to-weight ratio, and mental clarity.',
  },
] as const;

export function RoadToElite() {
  return (
    <section className="py-[120px] bg-[#1E1E20]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <SectionHeading title="The Road to Elite" align="center" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF5C00]/20 border-2 border-[#FF5C00] flex items-center justify-center mx-auto mb-6">
                <span className="text-[#FF5C00] font-headline-md text-xl font-bold">
                  {step.number}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[calc(80%)] h-[2px] bg-gradient-to-r from-[#FF5C00] to-[#FF5C00]/20" />
              )}
              <h3 className="font-headline-md text-lg font-bold uppercase mb-3">{step.title}</h3>
              <p className="text-[#8E8E93] text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

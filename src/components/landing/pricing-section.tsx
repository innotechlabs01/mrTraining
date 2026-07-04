import { Button } from '@/components/shared';

const PLANS = [
  {
    name: 'Starter',
    tagline: 'Foundational performance programming.',
    price: '$99',
    features: ['Core Program Access', 'Mobile App Integration'],
    excluded: ['Biometric Telemetry', '1-on-1 Coaching'],
    featured: false,
    cta: 'Get Started',
  },
  {
    name: 'Elite',
    tagline: 'The complete hybrid performance system.',
    price: '$199',
    features: [
      'All Starter Features',
      'Biometric Data Sync',
      'Monthly Strategy Call',
      'Nutrition Logic Engine',
    ],
    excluded: [],
    featured: true,
    cta: 'Go Elite',
  },
  {
    name: 'Pro',
    tagline: 'Unrestricted access for serious athletes.',
    price: '$349',
    features: [
      'Everything in Elite',
      'Weekly 1-on-1 Coaching',
      'Custom Supplementation',
      '24/7 Priority Support',
    ],
    excluded: [],
    featured: false,
    cta: 'Apply Now',
  },
];

export function PricingSection() {
  return (
    <section className="py-section-gap-lg bg-surface-container-lowest" id="pricing">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter text-center">
        <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-16">
          Choose Your Level
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card p-10 flex flex-col pricing-scale border-outline-variant/20 relative ${
                plan.featured
                  ? 'border-electric-orange shadow-2xl bg-surface-container-high'
                  : ''
              }`}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-electric-orange text-on-primary-container px-4 py-1 font-label-bold text-[10px] uppercase tracking-widest rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className={`font-headline-md text-2xl font-bold uppercase mb-2 ${plan.featured ? 'text-electric-orange' : ''}`}>
                {plan.name}
              </h3>
              <p className="text-muted-gray mb-8 font-body-md">{plan.tagline}</p>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-muted-gray font-body-md">/month</span>
              </div>

              <ul className="space-y-4 mb-12 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-body-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={plan.featured ? 'text-electric-orange' : 'text-velocity-blue'}>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {plan.excluded.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm opacity-40 font-body-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.featured ? 'primary' : 'outline'}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

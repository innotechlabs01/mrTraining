'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import { usePaddleCheckout } from '@/hooks/use-paddle-checkout';

const PLANS = [
  {
    name: 'Free',
    tagline: 'Start your 15-day performance evaluation.',
    price: '$0',
    period: '',
    features: ['Full Performance Access for 15 Days', 'Onboarding Assessment', 'App Access'],
    excluded: ['1-on-1 Coaching', 'Wearable Integration', 'Lab Panels'],
    featured: false,
    cta: 'Start Free Trial',
    badge: '15-Day Trial',
  },
  {
    name: 'Performance',
    tagline: 'App-based training with expert oversight.',
    price: '$199',
    period: '/month',
    priceId:
      process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID ?? 'pri_01kwqdq8xx7s4ptpp9gqyn9dms',
    features: [
      'App-Based Training Hub',
      'Weekly Coach Check-ins',
      'Basic Wearable Integration',
      'Community Squad Access',
    ],
    excluded: [],
    featured: false,
    cta: 'Select Tier',
  },
  {
    name: 'Elite',
    tagline: 'The complete hybrid performance system.',
    price: '$449',
    period: '/month',
    priceId: 'pri_01kwqdq945983ncpjpjndhvn0b',
    features: [
      'Direct 1:1 Head Coach Access',
      'Daily Plan Adjustments',
      'Comprehensive Bio-Analytics',
      'Quarterly Lab Blood Panels',
      'VIP Event Invites',
    ],
    excluded: [],
    featured: true,
    cta: 'Start Elite Training',
    badge: 'Most Popular',
  },
];

export function PricingSection() {
  const { handlePlanSelect, loading } = usePaddleCheckout();
  const { isLoaded } = useAuth();
  const router = useRouter();

  return (
    <section className="py-[120px] bg-[#131315]" id="pricing">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
            Choose Your Performance Tier
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`bg-[#1E1E20] border rounded-xl p-8 flex flex-col relative ${
                plan.featured ? 'border-[#FF5C00] shadow-2xl scale-105' : 'border-[#2C2C2E]/50'
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 font-label-bold text-[10px] uppercase tracking-widest rounded-full ${
                    plan.featured
                      ? 'bg-[#FF5C00] text-[#131315]'
                      : 'bg-[#007AFF] text-white'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <h3
                className={`font-headline-md text-2xl font-bold uppercase mb-2 ${
                  plan.featured ? 'text-[#FF5C00]' : ''
                }`}
              >
                {plan.name}
              </h3>
              <p className="text-[#8E8E93] mb-6 font-body-md text-sm">{plan.tagline}</p>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-[#8E8E93] font-body-md">{plan.period}</span>}
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-body-md">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={plan.featured ? '#FF5C00' : '#007AFF'}
                      strokeWidth="2"
                      className="shrink-0"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {plan.excluded.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm opacity-40 font-body-md"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0"
                    >
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.name === 'Free' ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (isLoaded) {
                      router.push('/sign-up');
                    }
                  }}
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  variant={plan.featured ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => handlePlanSelect(plan.name.toLowerCase(), plan.priceId!)}
                  disabled={loading === plan.name.toLowerCase()}
                >
                  {loading === plan.name.toLowerCase() ? 'Loading...' : plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

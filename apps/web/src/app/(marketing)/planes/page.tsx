import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';
import Link from 'next/link';

const plans = [
  {
    name: 'Solo Coach',
    price: 29,
    period: '/mo',
    description: 'Perfect for individual coaches managing up to 20 athletes.',
    features: [
      'Up to 20 athletes',
      'AI program generator',
      'Performance analytics',
      'Live session management',
      'Team communication',
      'Event scheduling',
      'Nutrition tracking',
      'Mobile app (PWA)',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Team',
    price: 79,
    period: '/mo',
    description: 'For coaching teams and gyms with multiple coaches.',
    features: [
      'Up to 100 athletes',
      'Everything in Solo',
      'Multiple coach accounts',
      'Shared exercise library',
      'Team dashboards',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    period: '/mo',
    description: 'For large organizations, federations, and high-performance centers.',
    features: [
      'Unlimited athletes',
      'Everything in Team',
      'Unlimited coaches',
      'White-label platform',
      'Custom domain',
      'SSO (SAML/OIDC)',
      'Dedicated success manager',
      'SLA & compliance',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PlansPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-white mb-6">
            Simple, Transparent <span className="text-brand-primary">Pricing</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            All plans include a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.popular
                  ? 'border-brand-primary/50 bg-brand-primary/5 shadow-xl shadow-brand-primary/10 ring-2 ring-brand-primary/20'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold text-brand-primary bg-brand-primary/10 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
              <p className="text-white/50 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl sm:text-5xl font-bold font-display text-white">
                  ${plan.price}
                </span>
                <span className="text-white/50">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/70">
                    <svg
                      className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.popular ? '/coach/login' : '/coach/login'}
                className={`block w-full py-3 rounded-lg text-center font-semibold text-sm transition-colors ${
                  plan.popular
                    ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-white/50 mb-4">All plans include a 14-day free trial. No credit card required.</p>
          <Link
            href="/coach/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            Create Free Account →
          </Link>
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-12">Compare Features</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 font-medium text-white">Feature</th>
                  <th className="pb-3 font-medium text-white text-center">Solo</th>
                  <th className="pb-3 font-medium text-brand-primary text-center">Team</th>
                  <th className="pb-3 font-medium text-white text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {[
                  { feature: 'Athletes', solo: '20', team: '100', enterprise: 'Unlimited' },
                  { feature: 'Coaches', solo: '1', team: '5', enterprise: 'Unlimited' },
                  { feature: 'AI Program Generator', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Performance Analytics', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Live Sessions', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Team Communication', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Event Management', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Nutrition Tracking', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Mobile App (PWA)', solo: '✓', team: '✓', enterprise: '✓' },
                  { feature: 'Shared Exercise Library', solo: '—', team: '✓', enterprise: '✓' },
                  { feature: 'Team Dashboards', solo: '—', team: '✓', enterprise: '✓' },
                  { feature: 'Advanced Analytics', solo: '—', team: '✓', enterprise: '✓' },
                  { feature: 'Custom Branding', solo: '—', team: '✓', enterprise: '✓' },
                  { feature: 'API Access', solo: '—', team: '✓', enterprise: '✓' },
                  { feature: 'White-Label Platform', solo: '—', team: '—', enterprise: '✓' },
                  { feature: 'Custom Domain', solo: '—', team: '—', enterprise: '✓' },
                  { feature: 'SSO (SAML/OIDC)', solo: '—', team: '—', enterprise: '✓' },
                  { feature: 'Dedicated Support', solo: 'Email', team: 'Priority', enterprise: '24/7 + Manager' },
                  { feature: 'SLA & Compliance', solo: '—', team: '—', enterprise: '✓' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="py-3 font-medium text-white">{row.feature}</td>
                    <td className="py-3 text-center text-white/60">{row.solo}</td>
                    <td className="py-3 text-center text-brand-primary font-medium">{row.team}</td>
                    <td className="py-3 text-center text-white/60">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
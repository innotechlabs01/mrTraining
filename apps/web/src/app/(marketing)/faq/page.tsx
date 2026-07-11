import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

const faqs = [
  { q: 'What is MR Training?', a: 'MR Training is a unified coaching platform for modern coaches. It includes AI program generation, athlete management, performance analytics, team communication, event scheduling, and nutrition tracking — all in one place.' },
  { q: 'Who is it for?', a: 'Solo coaches, coaching collectives, gyms, and high-performance teams. Whether you coach 5 athletes or 500, the platform scales.' },
  { q: 'How does AI program generation work?', a: 'You select training days, focus (strength/endurance/speed/mixed), intensity, and session duration. Our AI creates a periodized program with progressive overload, appropriate exercise selection, and recovery built in. You can edit any session before assigning.' },
  { q: 'Can I use my own exercises?', a: 'Yes. The exercise library is fully customizable. Add your own movements, videos, cues, and progressions.' },
  { q: 'Is athlete data private?', a: 'Absolutely. We are GDPR/CCPA compliant. Athlete data is encrypted at rest and in transit. We never sell data. You own your athletes\' data and can export/delete anytime.' },
  { q: 'What integrations exist?', a: 'Garmin, Whoop, Polar, Apple Health, Google Fit, Strava, TrainingPeaks, and CSV import/export. More coming.' },
  { q: 'Pricing?', a: 'Plans start at $29/mo for solo coaches. Team plans available. No per-athlete fees. 14-day free trial, no card required.' },
  { q: 'Support?', a: 'Email support (hello@mrtraining.com), in-app chat, and priority support on Team plans. Average response < 4 hours.' },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">FAQ</h1>
        <p className="text-lg text-white/70 mb-12">Quick answers to common questions. Can\'t find yours? Email hello@mrtraining.com</p>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="rounded-xl border border-white/5 bg-white/[0.03] group">
              <summary className="p-5 cursor-pointer list-none flex items-center justify-between text-white font-medium">
                {faq.q}
                <span className="text-brand-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 text-white/70 leading-relaxed border-t border-white/5">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
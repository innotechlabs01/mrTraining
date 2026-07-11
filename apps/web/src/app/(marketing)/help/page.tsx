import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

const helpSections = [
  { title: 'Getting Started', items: ['Create your account', 'Set up your coach profile', 'Invite your first athlete', 'Create your first program', 'Schedule a session'] },
  { title: 'Programs & AI', items: ['Generate AI programs', 'Edit & customize sessions', 'Exercise library management', 'Periodization models', 'Assign to athletes'] },
  { title: 'Athlete Management', items: ['Add/remove athletes', 'View readiness & flags', 'Track weight & composition', 'Message athletes', 'Export data'] },
  { title: 'Live Sessions', items: ['Create live sessions', 'Public vs private', 'Capacity management', 'Virtual/hybrid setup', 'Attendance tracking'] },
  { title: 'Billing & Account', items: ['Upgrade/downgrade plans', 'Payment methods', 'Invoice history', 'Cancel subscription', 'Data export/delete'] },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-5xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">Help Center</h1>
        <p className="text-lg text-white/70 mb-12 max-w-3xl">
          Step-by-step guides and common solutions. Need more help? Email hello@mrtraining.com
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpSections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="text-white/70 hover:text-white transition-colors cursor-pointer">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a href="mailto:hello@mrtraining.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors">
            Contact Support →
          </a>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
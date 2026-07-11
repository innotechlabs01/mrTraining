import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function ServicesPage() {
  const services = [
    { title: 'AI Program Design', desc: 'Generate personalized training programs in seconds. Periodized, adaptive, and exportable.', icon: '⚡' },
    { title: 'Performance Analytics', desc: 'Readiness scores, load management, progression tracking, and automated insights.', icon: '📈' },
    { title: 'Live Session Management', desc: 'Real-time coaching with capacity control, RPE collection, and quick notes.', icon: '🎥' },
    { title: 'Team Communication', desc: 'Announcements, direct messages, file sharing, and video calls — all integrated.', icon: '💬' },
    { title: 'Event & Competition Mgmt', desc: 'Public registration, capacity limits, modality support (virtual/hybrid/running).', icon: '🏆' },
    { title: 'Nutrition & Habits', desc: 'Meal plans, macro targets, habit streaks, and check-ins tied to training.', icon: '🥗' },
    { title: 'Athlete Marketplace', desc: 'Connect with new athletes or let them discover your coaching services.', icon: '🤝' },
    { title: 'White-Label Options', desc: 'Custom branding, domain, and client-facing portal for enterprise teams.', icon: '🏢' },
  ];

  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-40 pb-20 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold font-display text-white mb-4">Services</h1>
        <p className="text-lg text-white/70 mb-16 max-w-2xl">Everything a modern coach needs to scale their practice — from solo to enterprise.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-white/10 transition-colors">
              <span className="text-3xl mb-3 block">{s.icon}</span>
              <h3 className="text-xl font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-white/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
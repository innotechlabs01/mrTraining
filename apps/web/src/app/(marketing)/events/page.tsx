import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

const events = [
  { title: 'MR Training Coach Summit 2024', date: 'March 15–17, 2024', location: 'Austin, TX / Virtual', type: 'Conference', desc: '3 days of coaching science, platform workshops, and networking.' },
  { title: 'AI Program Design Workshop', date: 'Monthly (1st Tuesday)', location: 'Virtual', type: 'Workshop', desc: 'Hands-on: generate, customize, and periodize programs with AI.' },
  { title: 'Readiness & Load Management Deep Dive', date: 'Quarterly', location: 'Virtual', type: 'Webinar', desc: 'Using HRV, wellness, and neuromuscular data for decision-making.' },
  { title: 'Hybrid Coaching Business Roundtable', date: 'Bi-monthly', location: 'Virtual', type: 'Community', desc: 'Peer group for coaches running in-person + remote practices.' },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-5xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-4">Events & Workshops</h1>
        <p className="text-lg text-white/70 mb-12 max-w-2xl">Live learning, community, and networking for MR Training coaches.</p>
        <div className="space-y-6">
          {events.map((e) => (
            <div key={e.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 md:p-8 hover:border-white/10 transition-colors">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary">{e.type}</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">{e.location}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <h3 className="text-2xl font-bold text-white">{e.title}</h3>
                <time className="text-white/50 whitespace-nowrap">{e.date}</time>
              </div>
              <p className="text-white/60">{e.desc}</p>
              <a href="#" className="mt-4 inline-block text-brand-primary font-medium hover:underline">Register →</a>
            </div>
          ))}
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
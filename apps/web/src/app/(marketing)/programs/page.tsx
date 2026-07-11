import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';
import Link from 'next/link';

const programs = [
  { title: 'Strength', desc: 'Periodized powerlifting & strength programs. Linear, block, undulating, conjugate.', href: '/programs/strength', icon: '🏋️' },
  { title: 'Cardio', desc: 'Endurance, HIIT, threshold, and zone-based conditioning for all sports.', href: '/programs/cardio', icon: '🏃' },
  { title: 'Yoga & Mobility', desc: 'Recovery flows, dynamic mobility, and movement prep for athletes.', href: '/programs/yoga', icon: '🧘' },
  { title: 'Boxing & Combat', desc: 'Technical striking, conditioning, and fight camp periodization.', href: '/programs/boxing', icon: '🥊' },
];

export default function ProgramsPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-40 pb-20 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold font-display text-white mb-4">Training Programs</h1>
        <p className="text-lg text-white/70 mb-16 max-w-2xl">AI-generated or coach-built. Periodized. Sport-specific. Ready to assign.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((p) => (
            <Link key={p.title} href={p.href} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-white/10 hover:bg-white/[0.05] transition-colors group">
              <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{p.icon}</span>
              <h3 className="text-xl font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-white/60 mb-4">{p.desc}</p>
              <span className="text-brand-primary font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                View →
              </span>
            </Link>
          ))}
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
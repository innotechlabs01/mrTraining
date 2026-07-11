import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function StrengthPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">Strength Programs</h1>
        <p className="text-lg text-white/70 mb-12 max-w-3xl">
          Periodized strength templates for powerlifting, weightlifting, and general strength.
          All programs adapt to your athlete's schedule, equipment, and progression rate.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: 'Powerlifting Peaking (12wk)', focus: 'Meet prep', level: 'Intermediate–Advanced' },
            { name: 'Off-Season Strength (16wk)', focus: 'Hypertrophy + Base', level: 'All Levels' },
            { name: 'Olympic Lifting Cycle (10wk)', focus: 'Snatch/Clean & Jerk', level: 'Intermediate' },
            { name: 'General Strength (8wk)', focus: 'Foundation', level: 'Beginner–Intermediate' },
            { name: 'Bench Specialization (6wk)', focus: 'Upper Body', level: 'Intermediate' },
            { name: 'Deadlift Focus (8wk)', focus: 'Posterior Chain', level: 'Intermediate' },
          ].map((p) => (
            <div key={p.name} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold text-white mb-1">{p.name}</h3>
              <p className="text-white/50 text-sm mb-3">{p.focus}</p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">{p.level}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a href="/coach/planes" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors">
            Get Started →
          </a>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
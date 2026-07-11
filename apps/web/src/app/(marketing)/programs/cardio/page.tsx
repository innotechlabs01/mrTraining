import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function CardioPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">Cardio & Endurance</h1>
        <p className="text-lg text-white/70 mb-12 max-w-3xl">
          Zone-based running, cycling, and hybrid programs. From 5k to ultra-marathon, plus triathlon and hybrid athlete templates.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: '5k–10k Speed (8wk)', focus: 'VO2max + Lactate Threshold', level: 'Intermediate' },
            { name: 'Half Marathon (12wk)', focus: 'Aerobic Base + Race Pace', level: 'All Levels' },
            { name: 'Marathon (16–20wk)', focus: 'Long Run Progression', level: 'Intermediate–Advanced' },
            { name: 'Ultra 50k/50mi (24wk)', focus: 'Fat Adaptation + Time on Feet', level: 'Advanced' },
            { name: 'Triathlon Sprint/OLY (16wk)', focus: 'Swim/Bike/Run Balance', level: 'Intermediate' },
            { name: 'Hybrid Athlete (12wk)', focus: 'Strength + Endurance', level: 'Intermediate' },
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
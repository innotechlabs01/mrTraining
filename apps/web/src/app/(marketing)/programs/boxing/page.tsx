import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function BoxingPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">Boxing & Combat</h1>
        <p className="text-lg text-white/70 mb-12 max-w-3xl">
          Technical striking, conditioning, and fight preparation programs. From amateur to pro — periodized for peak performance on fight night.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: 'Technical Fundamentals (8wk)', focus: 'Stance, Footwork, Combinations', level: 'Beginner–Intermediate' },
            { name: 'Fight Camp (12wk)', focus: 'Peaking for Competition', level: 'Intermediate–Advanced' },
            { name: 'Conditioning & Gas Tank (8wk)', focus: 'Aerobic/Anaerobic Power', level: 'All Levels' },
            { name: 'Pad Work & Partner Drills', focus: 'Technique + Timing', level: 'Intermediate' },
            { name: 'Weight Cut Protocol (4wk)', focus: 'Safe, Science-Based', level: 'Advanced (Coach Supervised)' },
            { name: 'MMA Striking Transition (10wk)', focus: 'Boxing → MMA Adaptation', level: 'Intermediate' },
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
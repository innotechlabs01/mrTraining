import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function YogaPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-6">Yoga & Mobility</h1>
        <p className="text-lg text-white/70 mb-12 max-w-3xl">
          Recovery-focused flows, breath work, and mobility protocols. Designed for athletes to improve range of motion, reduce injury risk, and enhance recovery.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: 'Daily Flow (20min)', focus: 'Morning/Evening Reset', level: 'All Levels' },
            { name: 'Pre-Training Mobility (15min)', focus: 'Joint Prep + Activation', level: 'All Levels' },
            { name: 'Post-Training Recovery (25min)', focus: 'Parasympathetic Reset', level: 'All Levels' },
            { name: 'Hip & Shoulder Protocol (30min)', focus: 'Overhead/Squat Depth', level: 'Intermediate' },
            { name: 'Breath Work Series', focus: 'CO2 Tolerance + HRV', level: 'All Levels' },
            { name: 'Injury-Specific Protocols', focus: 'Low Back / Knee / Shoulder', level: 'As Needed' },
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
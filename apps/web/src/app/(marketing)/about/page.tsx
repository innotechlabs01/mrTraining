import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-40 pb-20 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold font-display text-white mb-8">About MR Training</h1>
        <div className="prose prose-invert max-w-none space-y-8">
          <p className="text-lg text-white/70">
            MR Training is a unified coaching platform built for modern coaches who want to deliver exceptional experiences to their athletes — without the administrative burden.
          </p>
          <p className="text-white/60">
            We started MR Training because we saw coaches juggling spreadsheets, PDFs, WhatsApp groups, and disconnected tools. Athletes deserved better. Coaches deserved better.
          </p>
          <h2 className="text-2xl font-semibold text-white">What We Believe</h2>
          <ul className="list-disc list-inside space-y-3 text-white/70">
            <li>Coaching is a relationship, not a transaction.</li>
            <li>Data should inform decisions, not replace intuition.</li>
            <li>Technology should disappear into the background.</li>
            <li>Every athlete deserves a program tailored to them.</li>
          </ul>
          <h2 className="text-2xl font-semibold text-white">Our Platform</h2>
          <p className="text-white/60">
            AI-powered program design, performance analytics, live session management, team communication, nutrition tracking, and event management — all in one place. Built by coaches, for coaches.
          </p>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
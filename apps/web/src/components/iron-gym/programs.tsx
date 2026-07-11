import { motion } from 'framer-motion';
import Link from 'next/link';
import { Zap, Heart, Sparkles, Dumbbell, ArrowRight as ArrowRightIcon } from 'lucide-react';

const programs = [
  { Icon: Zap, title: 'Strength', desc: 'Periodized powerlifting & strength programs. Linear, block, undulating, conjugate.', href: '/programs/strength', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { Icon: Heart, title: 'Cardio', desc: 'Endurance, HIIT, threshold, and zone-based conditioning for all sports.', href: '/programs/cardio', color: 'text-green-400', bg: 'bg-green-500/10' },
  { Icon: Sparkles, title: 'Yoga & Mobility', desc: 'Recovery flows, dynamic mobility, and movement prep for athletes.', href: '/programs/yoga', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { Icon: Dumbbell, title: 'Boxing & Combat', desc: 'Technical striking, conditioning, and fight camp periodization.', href: '/programs/boxing', color: 'text-red-400', bg: 'bg-red-500/10' },
];

export function IronGymPrograms() {
  return (
    <section id="programs" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-brand-primary font-medium text-lg mb-3">Training Programs</p>
          <h2 className="text-4xl lg:text-5xl font-bold font-display text-[#424242] leading-tight">
            AI-Generated & Coach-Built
          </h2>
          <p className="mt-4 text-lg text-[#9e9e9e] max-w-2xl mx-auto">
            Four modalities. Infinite combinations. All periodized and ready to assign.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-brand-primary/30 hover:shadow-lg transition-all"
            >
              <p.Icon className={`${p.color} ${p.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-2xl`} />
              <h3 className="text-xl font-semibold text-[#424242] mb-2">{p.title}</h3>
              <p className="text-[#9e9e9e] mb-4">{p.desc}</p>
              <Link href={p.href} className="inline-flex items-center gap-1 text-brand-primary font-medium hover:underline">
                View Programs <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/programs" className="inline-flex items-center gap-2 px-8 py-4 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors">
            View All Programs
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4-4 4m-5-8l4 4-4 4" />
    </svg>
  );
}
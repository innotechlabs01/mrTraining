'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const stats = [
  { value: '20+', label: 'Years of Experience' },
  { value: '15k+', label: 'Members Join' },
  { value: '14k+', label: 'Happy members' },
];

export function IronGymHero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-black">
      <img
        src="/iron-gym/hero-bg.png"
        alt="Gym training"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[120px] pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display font-black text-white uppercase leading-[0.9] text-[5rem] lg:text-[7rem] tracking-tight"
            >
              Level
              <br />
              up
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-3xl lg:text-4xl font-bold text-white uppercase"
            >
              ready to train your body
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-4 max-w-md text-[#f1f1f1] leading-relaxed"
            >
              Gym training is a structured and disciplined approach to physical exercise that
              focuses on strength, endurance and overall fitness improvement.
            </motion.p>

            <motion.a
              href="#contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
            >
              Lest join now
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12 flex flex-wrap gap-10"
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-4xl font-black text-brand-primary">{s.value}</div>
                  <div className="text-sm text-white/80 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <img
              src="/iron-gym/hero-person.png"
              alt="Athlete"
              className="w-full max-w-[500px] mx-auto object-contain drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

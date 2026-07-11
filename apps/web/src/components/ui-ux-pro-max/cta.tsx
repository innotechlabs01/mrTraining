'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-br from-indigo-600 to-indigo-700 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4"
        >
          Ready to ship better designs?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-indigo-100 max-w-xl mx-auto mb-8"
        >
          Join thousands of designers and developers who review with confidence. Start your free trial today.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg border border-indigo-400 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            Talk to sales
          </a>
        </motion.div>
      </div>
    </section>
  );
}

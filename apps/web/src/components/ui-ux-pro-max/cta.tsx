'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-br from-indigo-600 to-indigo-700">
      <div className="max-w-6xl mx-auto px-6 text-center">
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
          Join thousands of designers and developers who review with confidence.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

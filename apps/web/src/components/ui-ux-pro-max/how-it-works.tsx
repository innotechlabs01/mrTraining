'use client';

import { motion } from 'framer-motion';
import { Upload, Search, Share2 } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload your design',
    description: 'Import from Figma, Sketch, Adobe XD, or drag-and-drop your files directly. Your design is instantly available for review.',
  },
  {
    icon: Search,
    number: '02',
    title: 'Inspect & review',
    description: 'Inspect CSS properties, measurements, and assets. Leave precise comments on any element with contextual feedback.',
  },
  {
    icon: Share2,
    number: '03',
    title: 'Share & approve',
    description: 'Share a link with your team. Approve or request changes with one click. Every version is tracked and reversible.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Three simple steps from design to approval.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-indigo-200">
                {step.number}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

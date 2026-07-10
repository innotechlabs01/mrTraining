'use client';

import { motion } from 'framer-motion';
import { Upload, Search, Share2 } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: 1,
    title: 'Upload',
    description: 'Upload your design from Figma, Sketch, or direct file import.',
  },
  {
    icon: Search,
    number: 2,
    title: 'Inspect & Review',
    description: 'Inspect CSS, measurements, assets. Leave precise comments.',
  },
  {
    icon: Share2,
    number: 3,
    title: 'Share & Approve',
    description: 'Share with your team. Approve or request changes. Every version is tracked.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
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
          <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-[2px] bg-slate-200" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm">
                {step.number}
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

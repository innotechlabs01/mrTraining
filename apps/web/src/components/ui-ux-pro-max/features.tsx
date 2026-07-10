'use client';

import { motion } from 'framer-motion';
import { Eye, Code2, GitBranch } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Visual Review',
    description: 'Comment directly on designs. Pinpoint precision, threaded discussions, one-click approval.',
  },
  {
    icon: Code2,
    title: 'Code Inspector',
    description: 'Inspect CSS, measurements, typography, assets. Copy code with one click. Works with Figma/Sketch.',
  },
  {
    icon: GitBranch,
    title: 'Version History',
    description: 'Every change is saved. Compare versions, restore previous ones, full audit trail.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Everything you need to review designs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Stop juggling tools. One platform for review, inspection, and version control.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

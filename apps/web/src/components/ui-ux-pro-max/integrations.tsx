'use client';

import { motion } from 'framer-motion';

const tools = [
  { name: 'Figma', icon: 'F', color: 'text-indigo-600 bg-indigo-50' },
  { name: 'Sketch', icon: 'S', color: 'text-amber-600 bg-amber-50' },
  { name: 'Adobe XD', icon: 'Xd', color: 'text-purple-600 bg-purple-50' },
  { name: 'Zeplin', icon: 'Z', color: 'text-blue-600 bg-blue-50' },
  { name: 'Avocode', icon: 'A', color: 'text-emerald-600 bg-emerald-50' },
  { name: 'InVision', icon: 'In', color: 'text-rose-600 bg-rose-50' },
];

export function IntegrationsSection() {
  return (
    <section className="py-20 lg:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl font-bold text-slate-900 mb-3"
        >
          Works with your favorite tools
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="text-center text-slate-500 mb-12 max-w-md mx-auto"
        >
          Import designs directly from the tools your team already uses.
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-8">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${tool.color}`}>
                {tool.icon}
              </span>
              <span className="font-semibold text-slate-700">{tool.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

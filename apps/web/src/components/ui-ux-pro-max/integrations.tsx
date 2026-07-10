'use client';

import { motion } from 'framer-motion';

const tools = [
  { name: 'Figma', icon: 'F' },
  { name: 'Sketch', icon: 'S' },
  { name: 'XD', icon: 'Xd' },
  { name: 'Zeplin', icon: 'Z' },
];

export function IntegrationsSection() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl font-bold text-slate-900 mb-12"
        >
          Works with your favorite tools
        </motion.h2>

        <div className="flex flex-wrap items-center justify-center gap-12">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-400">
                {tool.icon}
              </span>
              <span className="text-lg font-semibold">{tool.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

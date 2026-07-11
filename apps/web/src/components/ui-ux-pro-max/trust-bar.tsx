'use client';

import { motion } from 'framer-motion';

const companies = [
  { name: 'Acme Corp', initials: 'AC' },
  { name: 'Designlab', initials: 'DL' },
  { name: 'Pixel Perfect', initials: 'PP' },
  { name: 'Studio 9', initials: 'S9' },
  { name: 'Vivid', initials: 'VV' },
];

export function TrustBarSection() {
  return (
    <section className="py-16 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8"
        >
          Trusted by innovative teams worldwide
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {companies.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2 text-slate-300"
            >
              <span className="text-lg font-black tracking-tight">{c.initials}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

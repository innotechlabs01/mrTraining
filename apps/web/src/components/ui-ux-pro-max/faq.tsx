'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Is there a free plan?',
    a: 'Yes! Our Free plan includes 1 project, 3 reviewers, and 7-day version history. It is perfect for individuals and small teams getting started with design review.',
  },
  {
    q: 'Can I import designs from Figma?',
    a: 'Absolutely. UI/UX Pro Max has native Figma integration. You can import your designs with one click, and they sync automatically when you make changes.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'Your trial converts to a Free plan automatically. No credit card is required to start, and you will never be charged without your explicit consent.',
  },
  {
    q: 'Can I collaborate with external reviewers?',
    a: 'Yes! You can invite anyone by email — designers, developers, product managers, or clients. External reviewers do not count toward your team seat limit.',
  },
  {
    q: 'How does version history work?',
    a: 'Every change is saved as a new version. You can compare any two versions side by side, add notes, and restore previous versions at any time.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-3xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4 text-center"
        >
          Frequently asked questions
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-500 text-center mb-12"
        >
          Everything you need to know about UI/UX Pro Max.
        </motion.p>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

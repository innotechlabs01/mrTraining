'use client';

import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-50/80 via-sky-50/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-50/60 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Design inspection reimagined
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight mb-6"
            >
              Inspect designs.{' '}
              <span className="text-indigo-600">Review with context.</span>{' '}
              Ship faster.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8"
            >
              UI/UX Pro Max unifies visual review, code inspection, and versioning in one place. No more context switching between tools.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                See how it works
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-xl shadow-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold">UX</span>
                  </div>
                  <p className="text-sm text-slate-400">Product preview</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-lg text-sm font-medium text-slate-700">
              ✦ Inspect mode active
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

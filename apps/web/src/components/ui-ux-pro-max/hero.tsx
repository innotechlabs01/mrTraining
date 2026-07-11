'use client';

import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              UX
            </div>
            <span className="text-sm font-bold text-slate-900">UI/UX Pro Max</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Start free trial
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-slate-700"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-slate-200 bg-white px-6 py-4 flex flex-col gap-4"
          >
            <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-slate-700">Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-sm text-slate-700">How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm text-slate-700">Pricing</a>
            <a href="#" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">
              Start free trial
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        )}
      </nav>

      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-100/40 via-sky-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-sm font-medium text-indigo-600 mb-6 border border-indigo-200/50">
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
                <span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-8">Review with context.</span>{' '}
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
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
              initial={{ opacity: 0, x: 40, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative rounded-xl shadow-2xl border border-slate-200 overflow-hidden bg-white">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-4 px-3 py-0.5 rounded-md bg-slate-200 text-xs text-slate-500 font-medium">
                    uiuxpromax.app / designs / latest
                  </span>
                </div>
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                  <div className="flex gap-4 h-full">
                    <div className="w-1/3 flex flex-col gap-2">
                      <div className="h-6 w-full rounded bg-indigo-100/50" />
                      <div className="h-20 w-full rounded-lg border border-slate-200 bg-white p-2 flex flex-col gap-1">
                        <div className="h-2 w-3/4 rounded bg-slate-200" />
                        <div className="h-2 w-1/2 rounded bg-slate-200" />
                        <div className="h-2 w-2/3 rounded bg-slate-200" />
                      </div>
                      <div className="h-20 w-full rounded-lg border border-indigo-200 bg-indigo-50/50 p-2 flex flex-col gap-1">
                        <div className="h-2 w-3/4 rounded bg-indigo-200" />
                        <div className="h-2 w-1/2 rounded bg-indigo-200" />
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <div className="h-2 w-1/2 rounded bg-indigo-200" />
                        </div>
                      </div>
                      <div className="h-6 w-full rounded bg-slate-200/50" />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Design</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Inspect</span>
                      </div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-6 w-20 rounded-md bg-indigo-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-16 rounded bg-slate-100" />
                          <div className="h-16 rounded bg-slate-100" />
                          <div className="h-16 rounded bg-slate-100" />
                          <div className="h-16 rounded bg-slate-100" />
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-300" />
                          <div className="text-xs text-slate-400">Approved by Sarah — 2h ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-lg text-sm font-medium text-indigo-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ✦ Inspect mode active
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

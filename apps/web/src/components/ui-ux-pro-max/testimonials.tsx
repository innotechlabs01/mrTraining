'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    name: 'Alex Rivera',
    role: 'Lead Designer at Designlab',
    avatar: 'AR',
    color: 'bg-indigo-500',
    quote:
      'UI/UX Pro Max cut our design review time in half. The ability to inspect CSS directly from the design saves hours of back-and-forth with developers.',
  },
  {
    name: 'Sarah Chen',
    role: 'Frontend Lead at Vivid',
    avatar: 'SC',
    color: 'bg-emerald-500',
    quote:
      'The version history feature is a game-changer. We can track every design decision, compare versions, and revert if needed. It gives us complete confidence.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Product Manager at Acme Corp',
    avatar: 'MJ',
    color: 'bg-amber-500',
    quote:
      'Having design review, code inspection, and collaboration in one tool simplified our workflow dramatically. Our shipping velocity increased by 40%.',
  },
  {
    name: 'Priya Patel',
    role: 'UX Director at Studio 9',
    avatar: 'PP',
    color: 'bg-rose-500',
    quote:
      'Our team of 20 designers now has a single source of truth for reviews. The approval workflows alone saved us countless Slack messages.',
  },
]

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const goTo = useCallback(
    (i: number) => {
      setDirection(i > current ? 1 : -1)
      setCurrent(i)
    },
    [current],
  )

  const next = useCallback(() => {
    setDirection(1)
    setCurrent((c) => (c + 1) % testimonials.length)
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next])

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  }

  const t = testimonials[current]

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
            Loved by design teams
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            See what our customers have to say about UI/UX Pro Max.
          </motion.p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="min-h-[220px] flex items-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="w-full"
                >
                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <p className="text-base text-slate-600 leading-relaxed mb-6">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-all"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`transition-all rounded-full ${
                      i === current
                        ? 'w-8 h-2 bg-indigo-600'
                        : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-all"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

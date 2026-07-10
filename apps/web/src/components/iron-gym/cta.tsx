'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function IronGymCta() {
  return (
    <section id="contact" className="bg-[#121212] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-black rounded-3xl overflow-hidden grid lg:grid-cols-2 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 lg:p-16 flex flex-col justify-center"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">
              Let&apos;s start gym training now
            </h2>
            <p className="mt-4 text-[#f1f1f1] max-w-md">
              get 50% off the first three classes you sign up for this month any GYM membership
            </p>

            <form
              className="mt-8 grid sm:grid-cols-2 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                placeholder="Enter You Name..."
                className="h-14 px-4 rounded-md bg-transparent border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-brand-primary"
              />
              <input
                type="tel"
                placeholder="Numbers Phone..."
                className="h-14 px-4 rounded-md bg-transparent border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-brand-primary"
              />
              <input
                type="email"
                placeholder="Your Email Address..."
                className="sm:col-span-2 h-14 px-4 rounded-md bg-transparent border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-brand-primary"
              />
              <a
                href="/sign-in"
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 h-14 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
              >
                Lest join now
                <ArrowRight className="w-4 h-4" />
              </a>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative hidden lg:block"
          >
            <img src="/iron-gym/cta.png" alt="Gym training" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

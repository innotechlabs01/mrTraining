'use client';

import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

export function IronGymTestimonials() {
  return (
    <section id="testimonials" className="relative bg-black py-24 overflow-hidden">
      <img
        src="/iron-gym/testimonials-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl lg:text-5xl font-black text-white"
        >
          What clients say with us
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <p className="text-lg text-white/90 leading-relaxed italic">
            &quot;I am extremely grateful for the positive impact gym training has had on my life;
            through consistent training, expert guidance from coaches, and access to top-notch
            facilities, I have witnessed a remarkable transformation in strength, endurance, and
            overall fitness levels.&quot;
          </p>

          <div className="flex justify-center gap-1 my-6">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star key={s} className="w-6 h-6 fill-[#fca600] text-[#fca600]" />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <img
              src="/iron-gym/testimonial-avatar.png"
              alt="Jhony breaker"
              className="w-14 h-14 rounded-full object-cover border-2 border-brand-primary"
            />
            <div className="text-white font-bold text-lg">Jhony breaker</div>
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-6 mt-10">
          <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span className="w-2 h-2 rounded-full bg-[#484848]" />
            <span className="w-2 h-2 rounded-full bg-[#484848]" />
          </div>
          <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

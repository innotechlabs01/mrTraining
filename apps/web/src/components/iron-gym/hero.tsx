'use client';

import { motion } from 'framer-motion';
import { Twitter, Facebook, Instagram, ArrowRight } from 'lucide-react';

export function IronGymHero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-black">
      <img
        src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      <div
        className="absolute -top-[300px] -right-[300px] w-[1527px] h-[1527px] rounded-full bg-[#d9d9d9]/20 pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 md:pt-[120px] pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display font-bold text-[#e0e0e0] leading-[1.1] text-5xl sm:text-6xl lg:text-[4.5rem] tracking-tight"
            >
              Elevate
              <br />
              your workout
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 max-w-lg text-[#bdbdbd] leading-relaxed text-base md:text-lg"
            >
              Transform your fitness journey with expert guidance, modern equipment, and a
              community that pushes you to reach your full potential.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4 md:gap-6"
            >
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-md bg-white text-[#212121] font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="flex items-center gap-4">
                <a href="#" className="text-[#757575] hover:text-white transition-colors" aria-label="Twitter">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#757575] hover:text-white transition-colors" aria-label="Facebook">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#757575] hover:text-white transition-colors" aria-label="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

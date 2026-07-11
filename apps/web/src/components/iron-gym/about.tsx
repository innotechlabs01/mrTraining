'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function IronGymAbout() {
  return (
    <section id="about" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex gap-4"
          >
            <img
              src="/iron-gym/program-1.png"
              alt="Personal training"
              className="w-[40%] sm:w-[200px] rounded-xl object-cover aspect-[5/9]"
            />
            <img
              src="/iron-gym/program-2.png"
              alt="Group coaching"
              className="w-[60%] sm:w-[350px] rounded-xl object-cover aspect-[5/6] self-end"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[#9e9e9e] font-medium text-lg">Are you looking for a Mentor?</p>
            <h2 className="mt-2 text-4xl lg:text-5xl font-bold text-[#424242] leading-tight">
              Coaches
            </h2>
            <p className="mt-6 text-[#9e9e9e] leading-relaxed text-lg">
              Our expert coaches bring years of experience across disciplines — from strength
              training and bodybuilding to functional fitness and martial arts. Whether you are
              a beginner or an advanced athlete, we have a program built for you.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-md bg-[#212121] text-white font-semibold hover:bg-[#424242] transition-colors"
            >
              Explore More
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

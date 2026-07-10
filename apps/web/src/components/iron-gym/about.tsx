'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function IronGymAbout() {
  return (
    <section className="relative bg-black py-24 overflow-hidden">
      <img
        src="/iron-gym/about-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img
              src="/iron-gym/about-img.png"
              alt="Training session"
              className="w-full max-w-[384px] rounded-md shadow-2xl"
            />
            <div className="absolute -bottom-6 -left-6 w-40 h-48 bg-brand-primary/20 rounded-md -z-10" />
            <div className="absolute -top-6 -right-6 w-40 h-48 border-2 border-brand-primary/40 rounded-md -z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">
              we have a lot of experience
            </h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              In quisque nunc dictumst etiam pellentesque et. Vel malesuada diam lorem tellus.
              Amet mauris feugiat ipsum natoque odio donec. Sit at lacus consequat justo odio
              condimentum dui. Faucibus id blandit feugiat mi tellus sit etiam donec aliquam.
              Dictumst egestas ut facilisi vel. Sem consequat fermentum pellentesque risus purus
              quis gravida. Nulla porttitor ultrices facilisis non commodo diam morbi cursus eu.
              Semper ut in mauris gravida id cursus urna. Magnis vulputate orci risus felis eget
              lectus morbi. Et cursus mauris condimentum pretium arcu sed dignissim.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
            >
              About Us
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const trainers = [
  { name: 'Borney Exiteid', img: '/iron-gym/trainer-1.png' },
  { name: 'elsa windia', img: '/iron-gym/trainer-2.png' },
  { name: 'Geourge aryo', img: '/iron-gym/trainer-3.png' },
  { name: 'Angela Mellisa', img: '/iron-gym/trainer-4.png' },
];

export function IronGymTrainers() {
  return (
    <section id="trainers" className="bg-[#121212] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-white"
          >
            Our professional trainers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-white/70"
          >
            Whether you&apos;re looking to set up a home gym or enhance your current workout routine
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trainers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-md overflow-hidden"
            >
              <div className="relative h-[536px]">
                <img src={t.img} alt={t.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 h-[168px] bg-black/80 flex flex-col items-center justify-center text-center px-4">
                  <div className="text-white font-bold text-lg capitalize">{t.name}</div>
                  <div className="text-white/80 text-xs mt-1">Rate Trainer :</div>
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-[#fca600] text-[#fca600]" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-10">
          <span className="w-2 h-2 rounded-full bg-brand-primary" />
          <span className="w-2 h-2 rounded-full bg-[#484848]" />
          <span className="w-2 h-2 rounded-full bg-[#484848]" />
        </div>
      </div>
    </section>
  );
}

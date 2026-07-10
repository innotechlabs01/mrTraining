'use client';

import { motion } from 'framer-motion';

const items = [
  {
    n: '01',
    title: 'Personal Training',
    desc: 'Our gyms offer personalized training sessions with certified personal trainers who create customized workout plans based on individual goals',
  },
  {
    n: '02',
    title: 'Equipment and facilities',
    desc: 'Our gyms offer personalized training sessions with certified personal trainers who create customized workout plans based on individual goals',
  },
  {
    n: '03',
    title: 'nutrition counseling',
    desc: 'Our gyms offer personalized training sessions with certified personal trainers who create customized workout plans based on individual goals',
  },
  {
    n: '04',
    title: 'speciality programs',
    desc: 'Our gyms offer personalized training sessions with certified personal trainers who create customized workout plans based on individual goals',
  },
];

export function IronGymWhyChooseUs() {
  return (
    <section id="why" className="bg-[#121212] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-white"
          >
            Why Choose Us
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-[#f1f1f1] leading-relaxed"
          >
            Gym workouts offer a versatile and customisable experience, allowing everyone to set
            specific fitness goals.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
          {items.map((item, i) => (
            <motion.div
              key={item.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-5 border-t border-white/10 pt-8"
            >
              <div className="text-3xl font-black text-white/90 shrink-0">{item.n}</div>
              <div>
                <h3 className="text-xl font-bold text-brand-primary mb-2">{item.title}</h3>
                <p className="text-white/70 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

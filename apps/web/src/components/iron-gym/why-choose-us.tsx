'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Award, Swords, Waves } from 'lucide-react';

const items = [
  {
    icon: Dumbbell,
    title: 'Modern Equipment',
    desc: 'Top-of-the-line machines and free weights to optimize every rep of your training session.',
  },
  {
    icon: Award,
    title: 'Expert Trainers',
    desc: 'Certified professionals who design personalized programs tailored to your specific goals.',
  },
  {
    icon: Swords,
    title: 'Boxing & MMA',
    desc: 'High-intensity combat training that builds strength, agility, and mental toughness.',
  },
  {
    icon: Waves,
    title: 'Yoga & Recovery',
    desc: 'Flexibility and recovery sessions to keep your body balanced and injury-free.',
  },
];

export function IronGymWhyChooseUs() {
  return (
    <section id="services" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-bold text-[#424242]"
            >
              Why Choose Us
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-[#9e9e9e] max-w-lg leading-relaxed"
            >
              We combine world-class facilities with expert coaching to deliver results that
              speak for themselves.
            </motion.p>

            <div className="mt-12 space-y-8">
              {items.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#424242] flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#424242]">{item.title}</h3>
                    <p className="mt-1 text-[#9e9e9e] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <img
                src="/iron-gym/why-1.png"
                alt="Gym training"
                className="w-full rounded-xl object-cover aspect-[3/4]"
              />
              <img
                src="/iron-gym/why-2.png"
                alt="Personal training"
                className="w-full rounded-xl object-cover aspect-[4/3]"
              />
            </div>
            <div className="pt-8">
              <img
                src="/iron-gym/why-3.png"
                alt="Group workout"
                className="w-full rounded-xl object-cover aspect-[3/4]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

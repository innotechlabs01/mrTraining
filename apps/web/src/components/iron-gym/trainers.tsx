'use client';

import { motion } from 'framer-motion';

const trainers = [
  { name: 'Alex Rivera', img: '/iron-gym/trainer-a.png' },
  { name: 'Sophia Chen', img: '/iron-gym/trainer-b.png' },
  { name: 'Marcus Johnson', img: '/iron-gym/trainer-c.png' },
  { name: 'Emma Williams', img: '/iron-gym/trainer-d.png' },
  { name: 'James Carter', img: '/iron-gym/trainer-e.png' },
  { name: 'Olivia Patel', img: '/iron-gym/trainer-f.png' },
];

export function IronGymTrainers() {
  return (
    <section id="trainers" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-bold text-[#424242]"
          >
            Meet Our Trainers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-[#9e9e9e]"
          >
            Dedicated professionals committed to helping you reach your fitness goals.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="overflow-hidden rounded-xl"
            >
              <img
                src={t.img}
                alt={t.name}
                className="w-full h-[400px] object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

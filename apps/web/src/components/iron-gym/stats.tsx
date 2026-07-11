'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '5+', label: 'Years of Service' },
  { value: '10+', label: 'Certified Trainers' },
  { value: '786+', label: 'Happy Members' },
  { value: '95%', label: 'Customer Satisfaction' },
];

export function IronGymStats() {
  return (
    <section id="stats" className="bg-[#111111] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-evenly gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-[#eeeeee]">{s.value}</div>
              <div
                className={`text-sm mt-1 font-medium ${
                  s.label === 'Customer Satisfaction' ? 'text-white' : 'text-[#eeeeee]'
                }`}
              >
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Newspaper, Briefcase, Images, Calendar, ArrowRight as ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

const moreItems = [
  { icon: Newspaper, title: 'Blog', desc: 'Coaching science, platform updates, and business insights for modern coaches.', href: '/blog' },
  { icon: Briefcase, title: 'Careers', desc: 'Join our team. Remote-first, big impact, coaching background a plus.', href: '/careers' },
  { icon: Images, title: 'Gallery', desc: 'Screenshots, athlete transformations, and platform highlights.', href: '/gallery' },
  { icon: Calendar, title: 'Events', desc: 'Live workshops, webinars, and community meetups for MR Training coaches.', href: '/events' },
];

export function IronGymMore() {
  return (
    <section id="more" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-brand-primary font-medium text-lg mb-3">More from MR Training</p>
          <h2 className="text-4xl lg:text-5xl font-bold font-display text-[#424242] leading-tight">
            Community & Resources
          </h2>
          <p className="mt-4 text-lg text-[#9e9e9e] max-w-2xl mx-auto">
            Learn, grow, and connect with the MR Training ecosystem.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {moreItems.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-brand-primary/30 hover:shadow-lg transition-all"
            >
              <m.icon className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="text-xl font-semibold text-[#424242] mb-2">{m.title}</h3>
              <p className="text-[#9e9e9e] mb-4">{m.desc}</p>
              <Link href={m.href} className="inline-flex items-center gap-1 text-brand-primary font-medium hover:underline">
                Explore <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
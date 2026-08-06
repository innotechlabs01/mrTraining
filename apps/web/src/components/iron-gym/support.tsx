'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Shield, FileText, LifeBuoy, ArrowRight as ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

const supportItems = [
  { icon: HelpCircle, title: 'FAQ', desc: 'Quick answers to common questions about billing, features, and setup.', href: '/faq' },
  { icon: Shield, title: 'Privacy', desc: 'How we protect your data and your athletes\' data. GDPR & CCPA compliant.', href: '/privacy' },
  { icon: FileText, title: 'Terms', desc: 'Terms of service, coach responsibilities, and platform policies.', href: '/terms' },
  { icon: LifeBuoy, title: 'Help Center', desc: 'Step-by-step guides for programs, live sessions, billing, and more.', href: '/help' },
];

export function IronGymSupport() {
  return (
    <section id="support" className="bg-[#0A0A0A] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-brand-primary font-medium text-lg mb-3">Support & Legal</p>
          <h2 className="text-4xl lg:text-5xl font-bold font-display text-white leading-tight">
            We&apos;re Here to Help
          </h2>
          <p className="mt-4 text-lg text-[#bdbdbd] max-w-2xl mx-auto">
            Comprehensive documentation, transparent policies, and responsive support.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportItems.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 hover:bg-white/[0.05] transition-colors"
            >
              <s.icon className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-[#bdbdbd] mb-4">{s.desc}</p>
              <Link href={s.href} className="inline-flex items-center gap-1 text-brand-primary font-medium hover:underline">
                Learn More <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
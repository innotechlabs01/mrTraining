'use client';

import { motion } from 'framer-motion';
import { Zap, BarChart3, Video, MessageSquare, Trophy, Utensils, Users, Globe } from 'lucide-react';

const services = [
  { icon: Zap, title: 'AI Program Design', desc: 'Generate personalized training programs in seconds. Periodized, adaptive, and exportable.' },
  { icon: BarChart3, title: 'Performance Analytics', desc: 'Readiness scores, load management, progression tracking, and automated insights.' },
  { icon: Video, title: 'Live Session Management', desc: 'Real-time coaching with capacity control, RPE collection, and quick notes.' },
  { icon: MessageSquare, title: 'Team Communication', desc: 'Announcements, direct messages, file sharing, and video calls — all integrated.' },
  { icon: Trophy, title: 'Event & Competition Mgmt', desc: 'Public registration, capacity limits, modality support (virtual/hybrid/running).' },
  { icon: Utensils, title: 'Nutrition & Habits', desc: 'Meal plans, macro targets, habit streaks, and check-ins tied to training.' },
  { icon: Users, title: 'Athlete Marketplace', desc: 'Connect with new athletes or let them discover your coaching services.' },
  { icon: Globe, title: 'White-Label Options', desc: 'Custom branding, domain, and client-facing portal for enterprise teams.' },
];

export function IronGymServices() {
  return (
    <section id="services" className="bg-[#0A0A0A] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-brand-primary font-medium text-lg mb-3">Our Services</p>
          <h2 className="text-4xl lg:text-5xl font-bold font-display text-white leading-tight">
            Everything a Modern Coach Needs
          </h2>
          <p className="mt-4 text-lg text-[#bdbdbd] max-w-2xl mx-auto">
            From AI-powered programming to live session management — all in one unified platform.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
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
              <p className="text-[#bdbdbd] leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
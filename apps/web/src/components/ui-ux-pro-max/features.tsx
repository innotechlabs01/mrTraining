'use client';

import { motion } from 'framer-motion';
import { Eye, Code2, GitBranch, Users, Palette, Zap } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Visual Review',
    description: 'Comment directly on designs with pixel precision. Threaded discussions, @mentions, and one-click approval workflows.',
  },
  {
    icon: Code2,
    title: 'Code Inspector',
    description: 'Inspect CSS, measurements, typography, and assets. Copy code with one click. Native Figma and Sketch integration.',
  },
  {
    icon: GitBranch,
    title: 'Version History',
    description: 'Every change is saved automatically. Compare versions side by side, restore previous ones, and maintain a full audit trail.',
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description: 'Review together from anywhere. Live cursors, shared annotations, and instant notifications keep everyone aligned.',
  },
  {
    icon: Palette,
    title: 'Design System Support',
    description: 'Import and sync your design tokens, components, and styles. Keep your codebase and designs in perfect harmony.',
  },
  {
    icon: Zap,
    title: 'API & Automation',
    description: 'Connect your CI/CD pipeline via REST API and webhooks. Automate design reviews, export assets, and sync with Jira.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Everything you need to review designs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Stop juggling tools. One platform for review, inspection, and version control.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

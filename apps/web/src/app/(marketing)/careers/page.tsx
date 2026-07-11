import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

const jobs = [
  { title: 'Senior Full-Stack Engineer', type: 'Full-time', location: 'Remote (Americas/EU)', desc: 'React, Next.js, TypeScript, PostgreSQL. Build the coaching platform of the future.' },
  { title: 'Product Designer', type: 'Full-time', location: 'Remote', desc: 'Design intuitive coach/athlete experiences. Design systems, prototyping, user research.' },
  { title: 'DevOps/Platform Engineer', type: 'Full-time', location: 'Remote', desc: 'AWS, Kubernetes, CI/CD, observability. Scale to 100k+ athletes.' },
  { title: 'Customer Success Lead', type: 'Full-time', location: 'Remote (US timezones)', desc: 'Onboard coaches, drive adoption, gather feedback. Coaching background a plus.' },
];

export default function CareersPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-4">Join Our Team</h1>
        <p className="text-lg text-white/70 mb-12 max-w-2xl">
          We\'re building the platform coaches deserve. Small team, big impact, remote-first.
        </p>
        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 md:p-8 hover:border-white/10 transition-colors">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary">{job.type}</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">{job.location}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{job.title}</h3>
              <p className="text-white/60 mb-4">{job.desc}</p>
              <a href="mailto:hello@mrtraining.com?subject=Application: {job.title}" className="text-brand-primary font-medium hover:underline">
                Apply →
              </a>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Don't see your role?</h3>
          <p className="text-white/60 mb-4">We're always looking for exceptional people. Send your portfolio to hello@mrtraining.com</p>
          <a href="mailto:hello@mrtraining.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors">
            Open Application →
          </a>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
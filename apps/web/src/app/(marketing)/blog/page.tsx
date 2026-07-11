import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

const posts = [
  { title: 'How AI is Changing Strength Coaching', date: '2024-01-15', excerpt: 'From periodization to exercise selection, here\'s how coaches are using MR Training\'s AI to save 10+ hours/week.', category: 'AI & Coaching' },
  { title: 'Periodization Models Explained', date: '2024-01-08', excerpt: 'Linear, block, undulating, conjugate — when to use each and how to combine them for your athletes.', category: 'Programming' },
  { title: 'Readiness Monitoring: Beyond HRV', date: '2024-01-02', excerpt: 'Sleep, subjective wellness, neuromuscular tests — building a complete readiness picture.', category: 'Analytics' },
  { title: 'Running a Hybrid Coaching Business', date: '2023-12-20', excerpt: 'In-person + remote athletes. Systems, pricing, and communication workflows that scale.', category: 'Business' },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-8">MR Training Blog</h1>
        <p className="text-lg text-white/70 mb-12 max-w-2xl">
          Coaching science, platform updates, and business insights for modern coaches.
        </p>
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 md:p-8 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary">{post.category}</span>
                <time className="text-white/40 text-sm">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{post.title}</h2>
              <p className="text-white/60 mb-4">{post.excerpt}</p>
              <a href="#" className="text-brand-primary font-medium hover:underline">Read more →</a>
            </article>
          ))}
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}
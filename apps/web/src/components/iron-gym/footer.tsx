'use client';

const links = ['Home', 'Service', 'Trainers', 'Testimonial', 'Contact us'];

export function IronGymFooter() {
  return (
    <footer className="bg-black">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="text-2xl font-black text-white">
            Iron<span className="text-brand-primary">Gym</span>
          </div>
          <div className="flex flex-wrap items-center gap-8">
            {links.map((l, i) => (
              <a
                key={l}
                href={i === 0 ? '#home' : '#contact'}
                className={`text-sm font-medium transition-colors ${
                  i === 0 ? 'text-brand-primary' : 'text-white hover:text-brand-primary'
                }`}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/70">
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <span className="w-px h-4 bg-white/20" />
            <a href="#" className="hover:text-white transition-colors">
              Terms and condition
            </a>
          </div>
          <div>&copy; 2023 All rights reserved. IronGym Company</div>
        </div>
      </div>
    </footer>
  );
}

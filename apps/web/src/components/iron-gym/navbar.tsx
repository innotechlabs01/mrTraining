'use client';

const links = [
  { label: 'Home', href: '#home', active: true },
  { label: 'Service', href: '#why' },
  { label: 'Trainers', href: '#trainers' },
  { label: 'Testimonial', href: '#testimonials' },
  { label: 'Contact us', href: '#contact' },
];

export function IronGymNavbar() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <nav className="max-w-7xl mx-auto h-[88px] px-6 flex items-center justify-between">
        <a href="#home" className="text-2xl font-black tracking-tight text-white">
          Iron<span className="text-brand-primary">Gym</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                l.active ? 'text-brand-primary' : 'text-white hover:text-brand-primary'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#contact"
          className="px-6 py-3 rounded-md bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors"
        >
          started now
        </a>
      </nav>
    </header>
  );
}

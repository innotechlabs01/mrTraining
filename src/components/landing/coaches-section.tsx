import { SectionHeading } from '@/components/shared';

const COACHES = [
  {
    name: 'Marcus Sterling',
    role: 'Founder / Head Coach',
    specialty: 'Endurance Specialist',
    initials: 'MS',
    description:
      'Pioneering the data-driven approach to athlete longevity and performance optimization.',
  },
  {
    name: 'Sarah Thorne',
    role: 'Performance Director',
    specialty: 'Bio-Analytics',
    initials: 'ST',
    description:
      'Specializing in metabolic flexibility and hormonal balance for executive athletes.',
  },
  {
    name: 'David Vane',
    role: 'Lead Strength Coach',
    specialty: 'Strength & Power',
    initials: 'DV',
    description:
      'Focused on explosive power and injury prevention for professional team-sport athletes.',
  },
] as const;

export function CoachesSection() {
  return (
    <section className="py-[120px] bg-[#131315]" id="coaches">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <SectionHeading
            title="The Architects"
            subtitle="Lead by the world's most sought-after performance specialists."
            className="mb-0"
          />
          <button className="flex items-center gap-2 text-[#FF5C00] font-label-bold text-xs uppercase tracking-[0.2em] group shrink-0">
            View All Coaches{' '}
            <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {COACHES.map((coach) => (
            <div
              key={coach.name}
              className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl p-8 hover:border-[#007AFF]/50 transition-all duration-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#007AFF]/60 rounded-full flex items-center justify-center text-white font-headline-md text-xl font-bold">
                  {coach.initials}
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-[#007AFF]/20 border border-[#007AFF]/30 text-[#007AFF] font-label-bold text-[10px] uppercase tracking-[0.15em] rounded mb-2">
                    {coach.specialty}
                  </span>
                  <h3 className="font-headline-md text-lg font-bold">{coach.name}</h3>
                  <p className="text-xs text-[#8E8E93]">{coach.role}</p>
                </div>
              </div>
              <p className="text-[#8E8E93] text-sm leading-relaxed">{coach.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

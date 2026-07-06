const FEATURES = [
  {
    icon: 'person_pin' as const,
    title: 'Personal Coach',
    description: 'Daily direct access to elite trainers for adjustments and accountability.',
  },
  {
    icon: 'directions_run' as const,
    title: 'Running Coach',
    description: 'Bio-mechanical analysis and personalized marathon preparation protocols.',
  },
  {
    icon: 'devices' as const,
    title: 'Wearables',
    description: 'Seamless bi-directional sync with Garmin, Apple Watch, and WHOOP.',
  },
  {
    icon: 'calendar_month' as const,
    title: 'Elite Events',
    description: 'Exclusive access to global summits and destination training camps.',
  },
];

function FeatureIcon({ icon }: { icon: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5">
      {icon === 'person_pin' && (
        <>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75" />
          <path d="M21 21v-2a4 4 0 00-3-3.85" />
        </>
      )}
      {icon === 'directions_run' && (
        <>
          <circle cx="13" cy="5" r="2" />
          <path d="M9 20l3-8 4 8" />
          <path d="M5 12l4-2 3 3 4-2" />
        </>
      )}
      {icon === 'devices' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 10h8v6H8z" />
          <path d="M12 16v2" />
        </>
      )}
      {icon === 'calendar_month' && (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="12" y1="14" x2="12" y2="18" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </>
      )}
    </svg>
  );
}

export function EcosystemSection() {
  return (
    <section className="py-[120px] bg-[#0F0F0F]" id="ecosystem">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
            The MR Training Ecosystem
          </h2>
          <p className="text-[#C4C7C7] max-w-2xl mx-auto font-body-lg">
            A 360-degree integration of technology, expert coaching, and data analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.slice(0, 2).map((feature) => (
            <div
              key={feature.title}
              className="bg-[#1C1C1C] border border-[#2C2C2C]/50 rounded-xl p-8 hover:border-[#FF6B00]/50 transition-all duration-500"
            >
              <div className="w-14 h-14 bg-[#0066FF]/10 flex items-center justify-center rounded-full mb-6">
                <FeatureIcon icon={feature.icon} />
              </div>
              <h3 className="font-headline-md text-2xl font-bold uppercase mb-3">{feature.title}</h3>
              <p className="text-[#C4C7C7] leading-relaxed">{feature.description}</p>
            </div>
          ))}

          <div className="md:col-span-2 flex justify-center -my-2">
            <span className="bg-[#0066FF] text-white px-6 py-2 rounded-full font-label-bold text-xs uppercase tracking-[0.2em]">
              HUB
            </span>
          </div>

          {FEATURES.slice(2).map((feature) => (
            <div
              key={feature.title}
              className="bg-[#1C1C1C] border border-[#2C2C2C]/50 rounded-xl p-8 hover:border-[#FF6B00]/50 transition-all duration-500"
            >
              <div className="w-14 h-14 bg-[#0066FF]/10 flex items-center justify-center rounded-full mb-6">
                <FeatureIcon icon={feature.icon} />
              </div>
              <h3 className="font-headline-md text-2xl font-bold uppercase mb-3">{feature.title}</h3>
              <p className="text-[#C4C7C7] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

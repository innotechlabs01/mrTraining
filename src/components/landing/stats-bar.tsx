const STATS = [
  { value: '10K+', label: 'Elite Athletes' },
  { value: '98%', label: 'Success Rate' },
  { value: '500K+', label: 'KM Logged' },
] as const;

export function StatsBar() {
  return (
    <section className="py-16 bg-[#131315]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="bg-[#1E1E20] border border-[#2C2C2E]/50 rounded-xl px-8 md:px-16 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-stats-number text-5xl md:text-6xl font-black text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-[#8E8E93] font-body-md text-sm uppercase tracking-[0.15em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

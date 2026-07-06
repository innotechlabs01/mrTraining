'use client';

const MACROS = [
  { label: 'Protein', value: 145, goal: 180, unit: 'g', color: '#FF6B00' },
  { label: 'Carbs', value: 220, goal: 280, unit: 'g', color: '#0066FF' },
  { label: 'Fat', value: 65, goal: 80, unit: 'g', color: '#C4C7C7' },
];

const CALORIES = { consumed: 1850, goal: 2400 };

export function NutritionTracker() {
  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Nutrition Tracker</span>
      <div className="flex items-center gap-8 mt-4">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {MACROS.map((macro, i) => {
              const radius = 14;
              const circumference = 2 * Math.PI * radius;
              const offset = (i * circumference) / 3;
              const fill = (macro.value / macro.goal) * circumference;
              return (
                <circle
                  key={macro.label}
                  cx="18" cy="18" r={radius}
                  fill="none"
                  stroke={macro.color}
                  strokeWidth="3"
                  strokeDasharray={`${fill} ${circumference - fill}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-stats-number text-lg font-black text-white">{CALORIES.consumed}</span>
            <span className="text-[#C4C7C7] text-xs">/ {CALORIES.goal}</span>
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {MACROS.map((macro) => (
            <div key={macro.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#C4C7C7] font-label-bold uppercase tracking-wider">{macro.label}</span>
                <span className="text-white font-bold">{macro.value}{macro.unit} / {macro.goal}{macro.unit}</span>
              </div>
              <div className="h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((macro.value / macro.goal) * 100, 100)}%`,
                    background: macro.color,
                    boxShadow: `0 0 6px ${macro.color}60`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

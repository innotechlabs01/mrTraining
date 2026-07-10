'use client';

import { useLang } from './i18n';

export function PromoMarquee() {
  const { txt } = useLang();
  const items = [
    txt('14 DÍAS GRATIS', '14 DAYS FREE'),
    txt('50% OFF FUNDADOR', '50% OFF FOUNDER'),
    txt('RETO 30 DÍAS', '30-DAY CHALLENGE'),
    txt('SIN TARJETA', 'NO CARD NEEDED'),
    txt('TODOS LOS DEPORTES', 'ALL SPORTS'),
  ];
  const row = [...items, ...items];

  return (
    <div className="relative overflow-hidden bg-brand-primary border-y border-brand-ember/30">
      <div className="flex whitespace-nowrap animate-marquee py-3">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-6 px-6 text-sm font-black uppercase tracking-wider text-surface-0">
            {item}
            <span className="text-surface-0/50">🔥</span>
          </span>
        ))}
      </div>
    </div>
  );
}

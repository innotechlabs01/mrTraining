'use client';

import { Flame } from 'lucide-react';
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
    <div className="relative overflow-hidden fire-gradient-bg border-y border-brand-primary/20">
      <div className="flex whitespace-nowrap animate-marquee py-4">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-8 px-8 text-body font-black uppercase tracking-[0.15em] text-brand-primary/80">
            {item}
            <Flame className="w-4 h-4 text-brand-primary/40" />
          </span>
        ))}
      </div>
    </div>
  );
}

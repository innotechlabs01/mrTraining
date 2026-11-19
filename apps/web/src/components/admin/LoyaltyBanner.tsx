'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, QrCode, CreditCard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoyaltyBannerProps {
  userName?: string;
  onSetUpClick: () => void;
}

export function LoyaltyBanner({ userName = 'Emon', onSetUpClick }: LoyaltyBannerProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#D9383A] via-[#A83279] to-[#6A11CB] p-6 sm:p-8 text-white shadow-xl">
      {/* Decorative background glow rings */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-48 w-48 rounded-full bg-orange-400/20 blur-2xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        {/* Left text column */}
        <div className="max-w-md space-y-3">
          <p className="text-sm font-medium tracking-wide text-white/90">
            Good Morning {userName},
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
            Monetiza y expande tu club con planes y fidelización
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Configura los planes de suscripción para que tus coaches se afilien y gestiona el programa de fidelización del club.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/admin/plans"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-[#141418] shadow-lg transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <CreditCard size={14} className="text-[#E07A3D]" />
              Gestionar Planes Coach
            </Link>

            <button
              type="button"
              onClick={onSetUpClick}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-black/20 backdrop-blur-sm px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-white/10"
            >
              <Sparkles size={14} className="text-amber-300" />
              Set Up Loyalty Card
            </button>
          </div>

          {/* Carousel indicators */}
          <div className="flex items-center gap-1.5 pt-2">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  activeSlide === idx ? 'w-6 bg-white' : 'w-2 bg-white/40'
                )}
              />
            ))}
          </div>
        </div>

        {/* Right 3D realistic cards preview */}
        <div className="relative flex shrink-0 items-center justify-center lg:pr-4">
          <div className="relative h-44 w-64 sm:h-48 sm:w-72">
            {/* Top Card: Coach Plan VIP Voucher */}
            <div className="absolute right-0 top-0 w-52 sm:w-56 rotate-[6deg] rounded-xl border border-white/20 bg-gradient-to-br from-[#1C1C24]/90 via-[#2C2C38]/90 to-[#121217]/90 p-3.5 shadow-2xl backdrop-blur-md transition-transform hover:rotate-3 duration-300">
              <div className="flex items-center justify-between text-[10px] text-white/80">
                <span className="font-bold flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#E07A3D]" />
                  FitFlow Coach
                </span>
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-bold text-amber-300">
                  PRO ELITE
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black tracking-wider text-white">COACH PASS</div>
                  <div className="text-[10px] text-white/70">HASTA 100 ATLETAS</div>
                </div>
                <QrCode size={24} className="text-white/80" />
              </div>
            </div>

            {/* Bottom Card: Gym Club Exclusive */}
            <div className="absolute bottom-0 left-2 w-52 sm:w-56 -rotate-[4deg] rounded-xl border border-amber-400/30 bg-gradient-to-tr from-[#1E1915]/95 via-[#342217]/95 to-[#161413]/95 p-3.5 shadow-2xl backdrop-blur-md transition-transform hover:rotate-0 duration-300">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold flex items-center gap-1 text-[#E07A3D]">
                  <Sparkles size={11} /> FitFlow Club
                </span>
                <span className="text-[9px] font-bold text-amber-300">EXCLUSIVE</span>
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-black tracking-wider text-amber-300">SUPER ADMIN</div>
                <div className="text-[9px] uppercase tracking-widest text-white/60">PLATFORM ECOSYSTEM</div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] text-white/70">
                <span>GESTIÓN DE PLANES</span>
                <span className="font-mono text-amber-200">#CRM-2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTipProps {
  text: string;
  placement?: 'top' | 'bottom';
  className?: string;
}

export function InfoTip({ text, placement = 'top', className }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-white/35 hover:text-white/70 transition-colors"
        aria-label="Qué significa este campo"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-[70] w-44 rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-[11px] leading-snug text-white/70 shadow-xl',
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}

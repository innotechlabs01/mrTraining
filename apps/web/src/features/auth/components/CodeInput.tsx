'use client';

import { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  isLoading?: boolean;
}

const DIGIT_COUNT = 6;

export function CodeInput({ value, onChange, onComplete, error, isLoading }: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codes = value.split('').slice(0, DIGIT_COUNT);
  while (codes.length < DIGIT_COUNT) {
    codes.push('');
  }

  const setRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      if (isLoading) return;
      if (!/^\d*$/.test(inputValue)) return;
      const digit = inputValue.slice(-1);
      const next = [...codes];
      next[index] = digit;
      const newValue = next.join('');
      onChange(newValue);

      if (digit && index < DIGIT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (digit && index === DIGIT_COUNT - 1 && next.every(Boolean)) {
        onComplete?.(newValue);
      }
    },
    [codes, isLoading, onChange, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (isLoading) return;
      if (e.key === 'Backspace' && !codes[index] && index > 0) {
        const next = [...codes];
        next[index - 1] = '';
        onChange(next.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codes, isLoading, onChange],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (isLoading) return;
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
      const next = [...codes];
      pasted.split('').forEach((char, i) => {
        if (i < DIGIT_COUNT) next[i] = char;
      });
      const newValue = next.join('');
      onChange(newValue);

      const target = Math.min(pasted.length, DIGIT_COUNT - 1);
      inputRefs.current[target]?.focus();

      if (next.every(Boolean)) {
        onComplete?.(newValue);
      }
    },
    [codes, isLoading, onChange, onComplete],
  );

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3" role="group" aria-label="Verification code input">
        {codes.map((digit, index) => (
          <input
            key={index}
            ref={setRef(index)}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            aria-label={`Digit ${index + 1}`}
            className={cn(
              'h-12 w-10 rounded-md text-center text-h3 font-display font-bold text-text-primary',
              'bg-surface-2 border border-surface-6',
              'transition-all duration-200',
              'focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30',
              error && 'border-error animate-[shake_0.3s_ease-in-out]',
              isLoading && 'opacity-50',
            )}
          />
        ))}
      </div>
      {error && (
        <p className="text-caption text-error" role="alert">
          {error}
        </p>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

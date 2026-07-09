'use client';

import { useState, useCallback, useRef } from 'react';

export function useCodeInput(length: number = 6) {
  const [codes, setCodes] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const digit = value.slice(-1);
      setCodes((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [length]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !codes[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codes]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      setCodes((prev) => {
        const next = [...prev];
        pasted.split('').forEach((char, i) => {
          if (i < length) next[i] = char;
        });
        return next;
      });
      const target = Math.min(pasted.length, length - 1);
      inputRefs.current[target]?.focus();
    },
    [length]
  );

  const reset = useCallback(() => {
    setCodes(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  }, [length]);

  return {
    codes,
    code: codes.join(''),
    setRef,
    handleChange,
    handleKeyDown,
    handlePaste,
    reset,
    isComplete: codes.every(Boolean),
  };
}

'use client';

import { type ReactNode, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  staggerDelay?: number;
}

export function SectionReveal({
  children,
  className,
  threshold = 0.15,
  staggerDelay = 0.1,
}: SectionRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px', amount: threshold });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

interface FadeInViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const directionOffset = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 24 },
  right: { x: -24 },
};

export function FadeInView({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = 'up',
}: FadeInViewProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...directionOffset[direction] },
        visible: { opacity: 1, x: 0, y: 0 },
      }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxLayer({ children, speed = 0.3, className }: ParallaxLayerProps) {
  return (
    <motion.div
      className={className}
      initial={{ y: 0 }}
      style={{ y: 0 }}
    >
      {children}
    </motion.div>
  );
}

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

import { useState, useEffect } from 'react';

export function CountUp({ end, duration = 2, prefix = '', suffix = '', className }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

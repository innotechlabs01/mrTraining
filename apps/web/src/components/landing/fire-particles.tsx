'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  color: string;
}

interface FireParticlesProps {
  count?: number;
  speed?: number;
  className?: string;
}

export function FireParticles({ count = 80, speed = 1, className }: FireParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width / dpr,
      y: (canvas.height / dpr) + Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      speedX: (Math.random() - 0.5) * 0.4 * speed,
      speedY: -(Math.random() * 0.8 + 0.3) * speed,
      color: Math.random() > 0.3
        ? `rgba(255, ${Math.floor(107 + Math.random() * 80)}, 0, 1)`
        : `rgba(255, ${Math.floor(150 + Math.random() * 60)}, ${Math.floor(Math.random() * 50)}, 0.7)`,
    });

    const particles: Particle[] = Array.from({ length: count }, createParticle);

    if (prefersReduced) {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      return;
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity = Math.max(0, p.opacity - 0.001);
        if (p.y < -10 || p.opacity <= 0) {
          const reset = createParticle();
          p.x = reset.x;
          p.y = reset.y;
          p.size = reset.size;
          p.opacity = reset.opacity;
          p.speedX = reset.speedX;
          p.speedY = reset.speedY;
          p.color = reset.color;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [count, speed]);

  return <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`} aria-hidden="true" />;
}

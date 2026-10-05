'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Parallax leggero sull’hero: il blocco sale mentre scrolli.
 * Solo transform; disattivato con prefers-reduced-motion.
 */
export function HeroParallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const view = Math.max(window.innerHeight, 1);
      // 0 in cima → 1 quando l’hero è quasi uscito
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.85)));
      const y = progress * 72;
      const scale = 1 - progress * 0.04;
      el.style.setProperty('--hero-y', `${y}px`);
      el.style.setProperty('--hero-scale', String(scale));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section
      ref={ref}
      className={className}
      style={
        {
          '--hero-y': '0px',
          '--hero-scale': '1',
        } as CSSProperties
      }
    >
      {children}
    </section>
  );
}

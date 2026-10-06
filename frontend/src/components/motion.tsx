import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Qwizo motion system primitives — see DESIGN_SYSTEM.md §20.
// transform + opacity only. Respects prefers-reduced-motion.

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Runs once on mount: fade + rise (or custom y/scale) with a delay. */
export function Enter({
  children,
  delay = 0,
  y = 16,
  scaleFrom,
  duration = 600,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  scaleFrom?: number;
  duration?: number;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, [reduced]);

  return (
    <div
      className={`${className} ease-qwizo`}
      style={{
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        opacity: on ? 1 : 0,
        transform: on
          ? 'none'
          : `translateY(${y}px)${scaleFrom ? ` scale(${scaleFrom})` : ''}`,
      }}
    >
      {children}
    </div>
  );
}

export function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return { ref, visible };
}

/**
 * Scroll reveal: fades + rises once when entering the viewport.
 * Pass delay={i * 80} to stagger grouped items.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 600,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
}) {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} ease-qwizo`}
      style={{
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
}

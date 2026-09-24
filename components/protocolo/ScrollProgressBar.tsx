'use client';

import { useEffect, useRef } from 'react';

/**
 * A 2px gold line at the top of the offer page that fills as the visitor
 * reads. Long page, one decision at the end: the line tells a busy reader how
 * much is left without a single word.
 *
 * Why not `components/ui/ScrollProgress.tsx`: that one springs the value with
 * Framer Motion and ignores `prefers-reduced-motion`. This one writes a
 * `transform: scaleX()` once per animation frame (compositor only, no layout)
 * and does not exist at all for people who asked the system for less motion:
 * the CSS hides it and the effect never attaches a listener.
 */
export function ProtocoloScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable));
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[var(--accent)] motion-reduce:hidden"
      style={{ transform: 'scaleX(0)' }}
    />
  );
}

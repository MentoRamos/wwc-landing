'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll-linked progress for the "Como funciona" timeline: a gold line fills
 * down the step numbers as the reader goes through them, and each step's
 * marker lights up when it crosses the reading line (60% of the viewport).
 *
 * Progressive enhancement, in both directions:
 * - Server HTML: the line is full and every step is marked reached, so
 *   without JavaScript (or for a crawler) the timeline is complete and static.
 * - `prefers-reduced-motion: reduce`: the effect returns before touching
 *   anything, so it stays in that complete, static state.
 * - Otherwise the first update runs on mount, while the timeline is still
 *   below the fold, so the switch to the "not yet reached" state is never
 *   seen.
 *
 * Only `transform: scaleY()` and a `data-reached` attribute change per frame,
 * both compositor/paint work, never layout.
 *
 * Expects its children to contain the `<li data-step>` elements; the line is
 * drawn at `--timeline-x` (the center of the step markers).
 */
export function TimelineProgress({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
    let raf = 0;

    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.6;
      const rect = root.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (line - rect.top) / Math.max(rect.height, 1)));
      fill.style.transform = `scaleY(${progress.toFixed(4)})`;
      for (const step of steps) {
        step.dataset.reached = step.getBoundingClientRect().top < line ? 'true' : 'false';
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative [--timeline-x:20px] md:[--timeline-x:24px]">
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[var(--timeline-x)] w-px -translate-x-1/2 bg-[var(--border)]"
      />
      <div
        ref={fillRef}
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[var(--timeline-x)] w-px -translate-x-1/2 origin-top bg-[var(--accent)]"
        style={{ transform: 'scaleY(1)' }}
      />
      {children}
    </div>
  );
}

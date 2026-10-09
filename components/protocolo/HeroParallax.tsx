'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** How far (px) the photo drifts while the hero scrolls away. Small on
 *  purpose: the audience is a CEO reading an offer, not a showreel. */
const MAX_SHIFT = 36;

/**
 * Subtle parallax for the hero photo: while the hero scrolls out of view, the
 * photo drifts down a few pixels slower than the page, so the frame feels
 * deep without anything moving on its own.
 *
 * - Compositor only: one `translate3d` per animation frame, no layout reads
 *   beyond a single `getBoundingClientRect` of the frame.
 * - The inner layer is scaled 1.1 from the server HTML on, so the drift never
 *   uncovers an edge and nothing changes size when the script attaches.
 * - `prefers-reduced-motion: reduce`: the listener is never attached and the
 *   photo stays exactly where the server put it.
 * - Stops working once the frame is off screen (the transform is clamped).
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frameEl = frameRef.current;
    const layer = layerRef.current;
    if (!frameEl || !layer) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = frameEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const travelled = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      layer.style.transform = `translate3d(0, ${(travelled * MAX_SHIFT).toFixed(1)}px, 0) scale(1.1)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div ref={frameRef} className="absolute inset-0 overflow-hidden">
      <div ref={layerRef} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.1)' }}>
        {children}
      </div>
    </div>
  );
}

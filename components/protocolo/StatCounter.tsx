'use client';

import { useEffect, useRef } from 'react';

/**
 * A number that counts up once when it scrolls into view (the UK Biobank
 * 30% and 38%).
 *
 * Server HTML carries the FINAL value, not zero: a crawler, a screenshot, a
 * reader without JavaScript and anyone with `prefers-reduced-motion: reduce`
 * see "30%" and nothing else. Only when the script runs, motion is allowed
 * and the number is still below the fold does it drop to 0 and wait for the
 * IntersectionObserver. A number already on screen when the page opened is
 * never touched, so it can't flash.
 *
 * The animated span is `aria-hidden`; screen readers get `srText` once, in
 * full, instead of a stream of intermediate numbers. Its width is locked to
 * the final value's before counting, so the text next to it never shifts.
 */
export function StatCounter({
  value,
  suffix = '%',
  srText,
  duration = 1400,
  className = '',
}: {
  value: number;
  suffix?: string;
  srText: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    const finalText = `${value}${suffix}`;
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = `0${suffix}`;

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = `${Math.round(eased * value)}${suffix}`;
          if (progress < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      el.textContent = finalText;
    };
  }, [value, suffix, duration]);

  return (
    <>
      <span className="sr-only">{srText}</span>
      <span ref={ref} aria-hidden="true" className={`inline-block text-right tabular-nums ${className}`}>
        {`${value}${suffix}`}
      </span>
    </>
  );
}

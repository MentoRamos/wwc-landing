'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useAnimation,
  useReducedMotion,
} from 'framer-motion';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { TESTIMONIALS } from '@/lib/constants';

const INTERVAL = 6000;
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── Progress bar ── */
function ProgressBar({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const controls = useAnimation();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    if (active) {
      controls.set({ scaleX: 0, originX: 0 });
      controls.start({ scaleX: 1, transition: { duration: INTERVAL / 1000, ease: 'linear' } })
        .then(() => onComplete());
    } else {
      controls.stop();
      controls.set({ scaleX: 0 });
    }
  }, [active, controls, onComplete, prefersReduced]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--border)]">
      <motion.div
        animate={controls}
        className="absolute inset-0 bg-[var(--accent)] origin-left"
        style={{ scaleX: 0 }}
      />
    </div>
  );
}

/* ── Dot with tooltip preview ── */
function Dot({
  index,
  active,
  testimonial,
  onClick,
}: {
  index: number;
  active: boolean;
  testimonial: (typeof TESTIMONIALS)[number];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && !active && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-sm pointer-events-none z-20"
          >
            <p className="text-[var(--text-2)] text-[11px] leading-[1.6] italic mb-1.5 line-clamp-2">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <p className="text-[var(--accent)] text-[10px] tracking-wide font-medium">{testimonial.name}</p>
            {/* Arrow */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--border)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Depoimento ${index + 1} — ${testimonial.name}`}
        className="relative h-4 flex items-center"
      >
        <motion.span
          animate={active
            ? { width: 32, backgroundColor: '#C9A84C' }
            : { width: 16, backgroundColor: hovered ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)' }}
          transition={{ duration: 0.35, ease }}
          className="block h-1 rounded-full"
          style={{ width: 16 }}
        />
      </button>
    </div>
  );
}

/* ── Cinematic 3D flip/blur transition ── */
const cinematic = {
  enter: {
    opacity: 0,
    rotateX: 18,
    scale: 0.94,
    filter: 'blur(8px)',
    y: 24,
  },
  center: {
    opacity: 1,
    rotateX: 0,
    scale: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    rotateX: -14,
    scale: 0.96,
    filter: 'blur(6px)',
    y: -18,
    transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] },
  },
};

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [running, setRunning] = useState(true);
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  /* Parallax for the decorative quote mark */
  const quoteY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  /* Pause on manual navigation, resume after 2s */
  function goTo(i: number) {
    setRunning(false);
    setCurrent(i);
    setTimeout(() => setRunning(true), 2000);
  }

  /* Swipe drag */
  const dragX = useMotionValue(0);
  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (Math.abs(info.offset.x) > 50) {
      const dir = info.offset.x < 0 ? 1 : -1;
      goTo((current + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
    }
  }

  /* Simple auto-advance when progress bar NOT active (reduced motion) */
  useEffect(() => {
    if (!prefersReduced) return;
    const t = setInterval(advance, INTERVAL);
    return () => clearInterval(t);
  }, [prefersReduced, advance]);

  return (
    <section ref={ref} className="py-28 md:py-40 relative overflow-hidden">
      {/* Background photo — conversation, heavily blended */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <Image
          src="/photos/conversation.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.07]"
          quality={40}
        />
      </motion.div>
      <div className="absolute inset-0 bg-[var(--bg)]/85" />
      <div className="absolute inset-0 grain pointer-events-none" />

      {/* Gold ambient */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, #C9A84C, transparent)' }} />

      {/* Decorative large quote mark with parallax */}
      <motion.div
        style={{ y: quoteY }}
        className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none select-none"
        aria-hidden
      >
        <svg viewBox="0 0 200 160" className="w-[260px] h-[200px] opacity-[0.025]" fill="var(--accent)">
          <path d="M0 160V80C0 35.8 35.8 0 80 0h20v40H80c-22.1 0-40 17.9-40 40v10h60v70H0zm120 0V80c0-44.2 35.8-80 80-80h0v40h0c-22.1 0-40 17.9-40 40v10h60v70H120z"/>
        </svg>
      </motion.div>

      <div className="container-lp relative z-10">
        <ScrollReveal>
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-6 flex items-center gap-4 justify-center">
            <span className="inline-block w-10 h-px bg-[var(--accent)]" />
            Depoimentos
            <span className="inline-block w-10 h-px bg-[var(--accent)]" />
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-3xl md:text-5xl leading-[0.98] tracking-[-0.03em] mb-16 text-center">
            O que disseram da{' '}
            <em className="italic text-[var(--accent)]">1ª edição.</em>
          </h2>
        </ScrollReveal>

        {/* Carousel — drag enabled */}
        <motion.div
          drag={prefersReduced ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
          style={{ x: dragX, cursor: 'grab' }}
          whileTap={{ cursor: 'grabbing' }}
          className="max-w-3xl mx-auto text-center min-h-[240px] flex flex-col items-center justify-center select-none relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              variants={cinematic}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ transformPerspective: 1200 }}
              className="w-full"
            >
              {/* Quote icon */}
              <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-10 h-10 mx-auto mb-8 opacity-20">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609L9.995 5.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>

              <blockquote className="font-display text-xl md:text-2xl lg:text-3xl leading-[1.4] text-[var(--text-1)] italic mb-8 px-4">
                &ldquo;{TESTIMONIALS[current].quote}&rdquo;
              </blockquote>
              <div className="text-[var(--accent)] text-sm font-medium tracking-wide">
                {TESTIMONIALS[current].name}
              </div>
              <div className="text-[var(--text-4)] text-xs mt-1.5 tracking-wider uppercase">
                {TESTIMONIALS[current].role}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Progress bar + Dots */}
        <div className="flex justify-center gap-3 mt-12 relative">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="relative">
              <Dot
                index={i}
                active={i === current}
                testimonial={t}
                onClick={() => goTo(i)}
              />
              {/* Progress bar lives inside active dot container */}
              {i === current && !prefersReduced && (
                <ProgressBar
                  active={running}
                  onComplete={advance}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

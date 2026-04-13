'use client';

import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { CountUp } from '@/components/animations/CountUp';
import { STATS } from '@/lib/constants';

export function NumbersStrip() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rawLineWidth = useTransform(scrollYProgress, [0, 0.5], ['0%', '100%']);
  const lineWidth = useSpring(rawLineWidth, { stiffness: 80, damping: 25, mass: 0.6 });

  // Scroll-driven glow intensity for accent lines
  const glowOpacity = useTransform(scrollYProgress, [0.1, 0.4, 0.6, 0.9], [0, 1, 1, 0]);

  // Background breathe/pulse: a slow oscillating gold glow
  const breatheScale = useSpring(
    useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0.85, 1, 0.85]),
    { stiffness: 30, damping: 15, mass: 1.2 }
  );
  const breatheOpacity = useTransform(scrollYProgress, [0.15, 0.45, 0.75], [0, 0.06, 0]);

  return (
    <section ref={ref} className="numbers-strip border-y border-[var(--border)] py-16 md:py-20 relative overflow-hidden">
      {/* Grain */}
      <div className="absolute inset-0 grain pointer-events-none" />

      {/* Background gold breathe pulse */}
      <motion.div
        style={{ opacity: breatheOpacity, scale: breatheScale }}
        className="absolute inset-0 pointer-events-none"
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(201,168,76,0.12), transparent)',
            willChange: 'transform, opacity',
          }}
        />
      </motion.div>

      {/* Animated accent line — top with gradient glow tied to scroll */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute top-0 left-0 h-px"
      >
        <motion.div
          style={{
            opacity: glowOpacity,
            background: 'linear-gradient(90deg, transparent, #C9A84C 30%, rgba(201,168,76,0.9) 50%, #C9A84C 70%, transparent)',
            boxShadow: '0 0 12px 2px rgba(201,168,76,0.35), 0 0 30px 6px rgba(201,168,76,0.12)',
          }}
          className="absolute inset-0"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }}
        />
      </motion.div>

      <div className="container-lp relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-4">
          {STATS.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.12} className="text-center">
              <StatCard stat={stat} index={i} />
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Animated accent line — bottom with gradient glow */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute bottom-0 right-0 h-px"
      >
        <motion.div
          style={{
            opacity: glowOpacity,
            background: 'linear-gradient(270deg, transparent, #C9A84C 30%, rgba(201,168,76,0.9) 50%, #C9A84C 70%, transparent)',
            boxShadow: '0 0 12px 2px rgba(201,168,76,0.35), 0 0 30px 6px rgba(201,168,76,0.12)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(270deg, transparent, rgba(201,168,76,0.4), transparent)' }}
        />
      </motion.div>
    </section>
  );
}

interface StatCardProps {
  stat: { value: string; suffix?: string; label: string };
  index: number;
}

function StatCard({ stat, index }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-60px' });

  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1, ease }}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Number with bounce finish */}
      <motion.div
        initial={{ scale: 1 }}
        animate={isInView ? {
          scale: [1, 1, 1.08, 0.96, 1.03, 1],
        } : { scale: 1 }}
        transition={{
          duration: 0.5,
          delay: index * 0.1 + 2.6, // fires just as CountUp finishes (duration 2.5)
          ease: 'easeOut',
          times: [0, 0.4, 0.6, 0.75, 0.88, 1],
        }}
        style={{ willChange: 'transform' }}
      >
        <div className="font-display text-5xl md:text-6xl lg:text-7xl text-[var(--accent)] mb-3 leading-none">
          {stat.value === '3h15' ? (
            <span>3h15</span>
          ) : (
            <CountUp
              target={parseInt(stat.value)}
              suffix={stat.suffix}
              duration={2.5}
            />
          )}
        </div>
      </motion.div>
      <div className="text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-[var(--text-3)]">
        {stat.label}
      </div>
    </motion.div>
  );
}

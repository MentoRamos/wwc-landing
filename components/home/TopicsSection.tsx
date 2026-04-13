'use client';

import Image from 'next/image';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef, useCallback } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { TOPICS } from '@/lib/constants';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ICONS: Record<string, React.ReactNode> = {
  glass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M8 21h8M12 17v4M5 3l1 9a6 6 0 0012 0l1-9H5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 9v3l2 2M9 1h6M9 23h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.13 14.87L6.5 12.24a15.39 15.39 0 015.37-5.37l4.01-2.74 2.11 2.11-2.74 4.01a15.39 15.39 0 01-5.37 5.37z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

interface TopicCardProps {
  topic: (typeof TOPICS)[number];
  index: number;
}

function TopicCard({ topic, index }: TopicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Raw mouse position values (0–1 inside card)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spotlight position (px inside card)
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);

  // 3D tilt: map mouse 0-1 → tilt degrees, spring-smoothed
  const rawRotateY = useTransform(mouseX, [0, 1], [8, -8]);
  const rawRotateX = useTransform(mouseY, [0, 1], [-6, 6]);
  const rotateY = useSpring(rawRotateY, { stiffness: 150, damping: 20, mass: 0.5 });
  const rotateX = useSpring(rawRotateX, { stiffness: 150, damping: 20, mass: 0.5 });

  // Spotlight opacity — spring on hover state
  const spotOpacity = useMotionValue(0);
  const spotOpacitySpring = useSpring(spotOpacity, { stiffness: 200, damping: 25 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
    spotX.set(e.clientX - rect.left);
    spotY.set(e.clientY - rect.top);
  }, [mouseX, mouseY, spotX, spotY]);

  const handleMouseEnter = useCallback(() => {
    spotOpacity.set(1);
  }, [spotOpacity]);

  const handleMouseLeave = useCallback(() => {
    // Reset tilt to center
    mouseX.set(0.5);
    mouseY.set(0.5);
    spotOpacity.set(0);
  }, [mouseX, mouseY, spotOpacity]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        willChange: 'transform',
      }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease }}
      className="group relative bg-[var(--bg-card)] border border-[var(--border)] p-7 md:p-9 h-full cursor-default overflow-hidden"
    >

      {/* Static gold top-edge glow — base */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(201,168,76,0.05), transparent)' }}
      />

      {/* Dynamic spotlight — follows cursor */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: spotOpacitySpring,
          background: useTransform(
            [spotX, spotY],
            ([x, y]) =>
              `radial-gradient(circle 160px at ${x}px ${y}px, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 45%, transparent 70%)`
          ),
        }}
      />

      {/* Brighter border glow on hover (layered ring) */}
      <motion.div
        className="absolute inset-0 pointer-events-none border border-transparent transition-colors duration-500"
        style={{
          opacity: spotOpacitySpring,
          boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.30)',
          willChange: 'opacity',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <motion.span
            className="text-[var(--accent)]"
            whileHover={{ scale: 1.12 }}
            transition={{ duration: 0.3, ease }}
          >
            {ICONS[topic.icon]}
          </motion.span>
          <span className="text-[10px] tracking-[0.2em] text-[var(--text-4)] font-mono">
            {topic.number}
          </span>
        </div>
        <h3 className="font-display text-lg md:text-xl mb-3 text-[var(--text-1)] leading-tight">
          {topic.title}
        </h3>
        <p className="text-[var(--text-3)] text-sm leading-[1.75]">
          {topic.description}
        </p>
      </div>
    </motion.div>
  );
}

export function TopicsSection() {
  // Cinematic stagger container
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.11,
        delayChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="programacao" className="py-28 md:py-40 relative overflow-hidden">
      {/* Background — presenting photo, faded */}
      <div className="absolute inset-0">
        <Image src="/photos/kaua-presenting.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.03]" quality={40} />
        <div className="absolute inset-0 bg-[var(--bg)]/95" />
      </div>

      <div className="container-lp relative z-10">
        <ScrollReveal>
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-8 flex items-center gap-4">
            <span className="inline-block w-12 h-px bg-[var(--accent)]" />
            Programação
          </p>
        </ScrollReveal>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-16">
          <ScrollReveal delay={0.1}>
            <h2 className="font-display text-4xl md:text-5xl leading-[0.98] tracking-[-0.03em]">
              6 blocos.{' '}
              <em className="italic text-[var(--accent)]">Zero teoria vazia.</em>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <p className="text-[var(--text-3)] text-sm max-w-sm leading-[1.8]">
              Dado real: <strong className="text-[var(--text-1)]">1h a menos de sono reduz 30% da capacidade cognitiva.</strong>
            </p>
          </ScrollReveal>
        </div>

        {/* Cinematic staggered grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {TOPICS.map((topic, i) => (
            <motion.div key={topic.number} variants={cardVariants} style={{ willChange: 'transform, opacity, filter' }}>
              <TopicCard topic={topic} index={i} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

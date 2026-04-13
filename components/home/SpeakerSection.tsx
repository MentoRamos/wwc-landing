'use client';

import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { SPEAKERS } from '@/lib/constants';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── 3D Tilt Card ── */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 20 });
  const springY = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Gold Ring Avatar ── */
function GoldRingAvatar({ initial }: { initial: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative mb-6 w-16 h-16 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Outer expanding ring */}
      <motion.span
        animate={hovered ? { scale: 1.6, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="absolute inset-0 rounded-full border border-[var(--accent)]/40"
      />
      {/* Second ring */}
      <motion.span
        animate={hovered ? { scale: 1.35, opacity: 0 } : { scale: 1, opacity: 0.6 }}
        transition={{ duration: 0.6, delay: 0.08, ease }}
        className="absolute inset-0 rounded-full border border-[var(--accent)]/30"
      />
      {/* Static base circle */}
      <motion.div
        animate={hovered
          ? { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: 'rgba(201,168,76,0.4)' }
          : { backgroundColor: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.15)' }}
        transition={{ duration: 0.4 }}
        className="w-16 h-16 rounded-full border flex items-center justify-center relative z-10"
      >
        <span className="font-display text-2xl text-[var(--accent)]">{initial}</span>
      </motion.div>
    </div>
  );
}

/* ── Clip-path image reveal ── */
function ImageReveal({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-15%' });

  return (
    <div ref={ref} className="relative aspect-[3/4] md:aspect-auto overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={isInView ? { clipPath: 'inset(0 0% 0 0)' } : { clipPath: 'inset(0 100% 0 0)' }}
        transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover"
          quality={90}
        />
        {/* Blend right edge into card */}
        <div className="hidden md:block absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[var(--bg-card)] to-transparent" />
        {/* Blend bottom into card on mobile */}
        <div className="md:hidden absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
      </motion.div>
      {/* Sweeping gold sheen that follows the reveal */}
      <motion.div
        className="absolute inset-y-0 w-[3px] bg-[var(--accent)]/20 blur-sm z-10"
        initial={{ left: '0%' }}
        animate={isInView ? { left: '100%' } : { left: '0%' }}
        transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
      />
    </div>
  );
}

export function SpeakerSection() {
  const featured = SPEAKERS.find((s) => s.featured)!;
  const others = SPEAKERS.filter((s) => !s.featured);

  /* Cinematic stagger container */
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.14,
        delayChildren: 0.05,
      },
    },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="palestrantes" className="py-28 md:py-40 relative overflow-hidden">
      {/* Background — hero keynote, ultra faded */}
      <div className="absolute inset-0">
        <Image src="/photos/hero-keynote.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.04]" quality={40} />
        <div className="absolute inset-0 bg-[var(--bg)]/90" />
      </div>

      <div className="container-lp relative z-10">
        <ScrollReveal>
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-8 flex items-center gap-4">
            <span className="inline-block w-12 h-px bg-[var(--accent)]" />
            Palestrantes
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.98] tracking-[-0.03em] mb-16">
            Quem estava{' '}
            <em className="italic text-[var(--accent)]">no palco.</em>
          </h2>
        </ScrollReveal>

        {/* Featured speaker — editorial layout with clip-path reveal */}
        <ScrollReveal delay={0.15}>
          <div className="grid md:grid-cols-[1fr_1.4fr] gap-0 md:gap-0 mb-16 relative group">
            {/* Photo with clip-path reveal from left to right */}
            <ImageReveal src="/photos/kaua-portrait-close.jpg" alt={featured.name} />

            {/* Info */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] border-l-0 p-8 md:p-12 flex flex-col justify-center relative">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '60px' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3, ease }}
                className="h-px bg-[var(--accent)] mb-6 overflow-hidden"
              />
              <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--accent)] mb-4">
                Host & Curador
              </div>
              <h3 className="font-display text-3xl md:text-4xl mb-5 text-[var(--text-1)]">
                {featured.name}
              </h3>
              <p className="text-[var(--text-2)] text-base leading-[1.85] mb-8">
                {featured.bio}
              </p>
              <div className="flex gap-4 items-center">
                <span className="w-10 h-px bg-[var(--accent)]/30" />
                <span className="text-[var(--text-3)] text-xs italic tracking-wide">UWell Health Club</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Other speakers — cinematic stagger + 3D tilt */}
        <motion.div
          className="grid sm:grid-cols-3 gap-4 md:gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
        >
          {others.map((speaker) => (
            <motion.div key={speaker.name} variants={cardVariants}>
              <TiltCard className="h-full">
                <motion.div
                  whileHover={{ borderColor: 'rgba(201, 168, 76, 0.22)' }}
                  transition={{ duration: 0.4, ease }}
                  className="bg-[var(--bg-card)] border border-[var(--border)] p-7 md:p-9 flex flex-col cursor-default h-full"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <GoldRingAvatar initial={speaker.name.charAt(0)} />
                  <h3 className="font-display text-xl mb-1.5 text-[var(--text-1)]">
                    {speaker.name}
                  </h3>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-[var(--accent)] mb-4">
                    {speaker.role}
                  </div>
                  <p className="text-[var(--text-3)] text-sm leading-[1.75]">
                    {speaker.bio}
                  </p>
                </motion.div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

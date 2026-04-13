'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { EVENT } from '@/lib/constants';
import { Logo } from '@/components/ui/Logo';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const springConfig = { stiffness: 60, damping: 20, mass: 1 };

/* Clip-path reveal variant — text slides up from masked bottom */
const revealVariants = {
  hidden: { clipPath: 'inset(100% 0% 0% 0%)', y: '30%' },
  visible: (delay: number) => ({
    clipPath: 'inset(0% 0% 0% 0%)',
    y: '0%',
    transition: { duration: 1.25, delay, ease },
  }),
};

/* Fade-up variant for supporting elements */
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay, ease },
});

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  /* Smooth spring-based parallax */
  const rawY      = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const rawScale  = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const rawTextY  = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const y       = useSpring(rawY,      springConfig);
  const scale   = useSpring(rawScale,  springConfig);
  const textY   = useSpring(rawTextY,  springConfig);
  const opacity = useSpring(rawOpacity, { stiffness: 80, damping: 25 });

  /* Video: detect, then fade in once ready */
  const [hasVideo, setHasVideo]       = useState(false);
  const [videoReady, setVideoReady]   = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch('/video/wwc-highlight.mp4', { method: 'HEAD' })
      .then((res) => setHasVideo(res.ok))
      .catch(() => setHasVideo(false));
  }, []);

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] w-full overflow-hidden flex items-end"
    >
      {/* ── Background: video or photo with spring parallax + Ken Burns ── */}
      <motion.div
        style={{ y, scale, willChange: 'transform' }}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1.04 }}
        transition={{ duration: 16, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        {/* Loading shimmer — shown until video is ready */}
        <AnimatePresence>
          {hasVideo && !videoReady && (
            <motion.div
              key="shimmer"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-[#0C0C0C] z-10"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(201,168,76,0.04) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2.4s ease-in-out infinite',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {hasVideo ? (
          <motion.video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            poster="/photos/kaua-portrait-seated.jpg"
            onCanPlayThrough={() => setVideoReady(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: videoReady ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
            style={{ filter: 'brightness(0.85) contrast(1.1)', willChange: 'transform' }}
          >
            <source src="/video/wwc-highlight.mp4" type="video/mp4" />
          </motion.video>
        ) : (
          <Image
            src="/photos/kaua-portrait-seated.jpg"
            alt="Kauã Ramos — Wealth & Wellness Connect"
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
            style={{ filter: 'brightness(0.9) contrast(1.1)' }}
            priority
            quality={95}
          />
        )}

        {/* Fallback image when video exists but hasn't loaded yet */}
        {hasVideo && !videoReady && (
          <Image
            src="/photos/kaua-portrait-seated.jpg"
            alt="Kauã Ramos — Wealth & Wellness Connect"
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
            style={{ filter: 'brightness(0.9) contrast(1.1)' }}
            priority
            quality={80}
          />
        )}
      </motion.div>

      {/* ── Overlay stack ── */}
      <motion.div style={{ opacity }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[var(--bg)]/40" />

        {/* Mobile: strong bottom gradient */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              'linear-gradient(to top, var(--bg) 0%, rgba(12,12,12,0.97) 25%, rgba(12,12,12,0.8) 45%, rgba(12,12,12,0.3) 65%, transparent 85%)',
          }}
        />

        {/* Desktop: diagonal gradient */}
        <div
          className="hidden md:block absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, var(--bg) 0%, rgba(12,12,12,0.9) 15%, rgba(12,12,12,0.6) 35%, rgba(12,12,12,0.2) 55%, transparent 75%)',
          }}
        />

        {/* Gold ambient glow — breathing pulse */}
        <div
          className="absolute inset-0 gold-breathe"
          style={{
            background: 'radial-gradient(ellipse 50% 60% at 30% 70%, #C9A84C, transparent)',
          }}
        />

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />

        {/* Vignette */}
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 250px rgba(0,0,0,0.5)' }} />
        <div className="absolute inset-0 grain pointer-events-none" />
      </motion.div>

      {/* ── Logo — top right, desktop only ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 1.8, ease }}
        className="absolute top-28 md:top-32 right-6 md:right-10 lg:right-16 z-10 hidden md:block"
        layoutId="hero-logo"
      >
        <Logo size={120} />
      </motion.div>

      {/* ── Main content with spring parallax ── */}
      <motion.div
        style={{ y: textY, willChange: 'transform' }}
        className="relative z-10 container-lp pb-16 md:pb-36 lg:pb-44 pt-40 md:pt-32"
      >
        {/* Eyebrow */}
        <motion.p
          {...fadeUp(0.5)}
          className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase text-[var(--accent)] mb-6 md:mb-10 flex items-center gap-4"
        >
          <span className="inline-block w-12 md:w-16 h-px bg-[var(--accent)]" />
          {EVENT.name}
        </motion.p>

        {/* H1 line 1 — clip-path reveal */}
        <div className="overflow-hidden mb-1 md:mb-2">
          <motion.h1
            custom={0.65}
            initial="hidden"
            animate="visible"
            variants={revealVariants}
            className="font-display font-light text-[14vw] sm:text-[12vw] md:text-[9vw] lg:text-[7vw] xl:text-[6.25rem] leading-[0.92] tracking-[-0.04em] text-[var(--text-1)]"
            style={{ willChange: 'transform' }}
          >
            A Era do
          </motion.h1>
        </div>

        {/* H1 line 2 — clip-path reveal, staggered */}
        <div className="overflow-hidden mb-8 md:mb-14">
          <motion.h1
            custom={0.88}
            initial="hidden"
            animate="visible"
            variants={revealVariants}
            className="font-display italic font-light text-[14vw] sm:text-[12vw] md:text-[9vw] lg:text-[7vw] xl:text-[6.25rem] leading-[0.92] tracking-[-0.04em] text-[var(--accent)]"
            style={{ willChange: 'transform' }}
          >
            CEO Quantificado.
          </motion.h1>
        </div>

        {/* Body copy */}
        <motion.p
          {...fadeUp(1.15)}
          className="text-[var(--text-2)] text-sm md:text-lg font-light max-w-xl mb-10 md:mb-16 leading-[1.75]"
        >
          O evento que conecta alta performance, saúde baseada em dados
          e networking de elite para CEOs e executivos.
        </motion.p>

        {/* CTA row */}
        <motion.div
          {...fadeUp(1.35)}
          className="flex flex-col sm:flex-row gap-4 md:gap-5 items-stretch sm:items-center"
        >
          {/* Primary CTA — framer-motion micro-interaction */}
          <motion.a
            href="#interesse"
            whileHover={{
              scale: 1.035,
              boxShadow: '0 0 28px rgba(201,168,76,0.45), 0 0 8px rgba(201,168,76,0.2)',
            }}
            whileTap={{ scale: 0.975 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="btn-glow group inline-flex items-center justify-center text-center gap-3 px-7 md:px-11 py-3.5 md:py-5 bg-[var(--accent)] text-[var(--bg)] text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-transparent hover:text-[var(--accent)] border border-[var(--accent)] transition-colors duration-500"
          >
            Quero participar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1.5">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.a>

          {/* Secondary CTA */}
          <a
            href="#galeria"
            className="group inline-flex items-center gap-3 py-5 px-2 text-[11px] font-normal tracking-[0.22em] uppercase text-[var(--text-2)] hover:text-[var(--accent)] transition-colors duration-500 border-b border-white/10 hover:border-[var(--accent)]/30"
          >
            Ver 1ª edição
            <span className="inline-block transition-transform duration-500 group-hover:translate-y-1">↓</span>
          </a>
        </motion.div>
      </motion.div>

      {/* ── Bottom-right meta strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2, ease }}
        className="absolute bottom-28 right-6 md:right-10 lg:right-16 z-10 hidden lg:flex gap-14 items-end"
      >
        {[
          { label: 'Convidados', value: `${EVENT.edition1.attendees}`, accent: true },
          { label: 'Duração', value: EVENT.edition1.duration, accent: false },
          { label: '1ª Edição', value: EVENT.edition1.city, accent: false },
        ].map((item) => (
          <div key={item.label} className="text-right">
            <div className="text-[9px] tracking-[0.3em] uppercase text-[var(--text-4)] mb-2">
              {item.label}
            </div>
            <div className={`font-display text-2xl ${item.accent ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>
              {item.value}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Scroll indicator — animated chevron line ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.2 }}
        className="absolute bottom-10 left-6 md:left-10 lg:left-16 z-10 hidden md:flex flex-col items-center gap-3"
      >
        <span
          className="text-[9px] tracking-[0.3em] uppercase text-[var(--text-4)]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Scroll
        </span>

        {/* Animated line + chevron */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-px h-10 bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 w-px h-[40%] bg-[var(--accent)]"
              animate={{ y: ['-100%', '300%'] }}
              transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }}
            />
          </div>
          {/* Pulsing chevron */}
          <motion.svg
            viewBox="0 0 12 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-2 text-[var(--accent)]"
            animate={{ y: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          >
            <path d="M1 1l5 5 5-5" />
          </motion.svg>
        </div>
      </motion.div>

    </section>
  );
}

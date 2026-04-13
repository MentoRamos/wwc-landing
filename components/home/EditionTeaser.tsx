'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { Logo } from '@/components/ui/Logo';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Split text into individual word spans for animation
function WordReveal({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: delay + i * 0.08, ease }}
          >
            {word}{i < words.length - 1 ? '\u00a0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// Floating particle dot
function FloatingParticle({ x, y, duration, delay }: { x: string; y: string; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        background: 'radial-gradient(circle, #C9A84C 0%, #C9A84C80 60%, transparent 100%)',
        boxShadow: '0 0 8px 2px #C9A84C60',
      }}
      animate={{
        y: [0, -28, 0],
        x: [0, 12, 0],
        opacity: [0.3, 0.8, 0.3],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function EditionTeaser() {
  const ref = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const logoInView = useInView(logoRef, { once: true });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [0.95, 1.05]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.06, 0]);

  return (
    <section ref={ref} className="py-32 md:py-44 relative overflow-hidden">
      {/* Animated gold glow */}
      <motion.div style={{ opacity: glowOpacity, scale: bgScale }} className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, #C9A84C, transparent)' }}
        />
      </motion.div>

      {/* Grain */}
      <div className="absolute inset-0 grain pointer-events-none" />

      {/* Floating gold particles */}
      <FloatingParticle x="18%" y="25%" duration={6.5} delay={0} />
      <FloatingParticle x="78%" y="60%" duration={8.2} delay={1.4} />
      <FloatingParticle x="62%" y="20%" duration={7.1} delay={2.8} />

      {/* Decorative lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent to-[var(--accent)]/20" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-t from-transparent to-[var(--accent)]/20" />

      <div className="container-lp relative z-10 text-center">
        {/* Logo with glow pulse */}
        <div ref={logoRef} className="flex justify-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={logoInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 1, ease }}
            className="relative"
          >
            {/* Glow pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 50% at 50% 50%, #C9A84C22, transparent)',
              }}
              animate={logoInView ? {
                opacity: [0.4, 1, 0.4],
                scale: [0.95, 1.08, 0.95],
              } : {}}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />
            <Logo size={160} />
          </motion.div>
        </div>

        <ScrollReveal delay={0.1}>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[var(--accent)] mb-8">
            2ª Edição — Em breve
          </p>
        </ScrollReveal>

        {/* Word-by-word reveal headline */}
        <div className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.92] tracking-[-0.04em] mb-8">
          <div className="overflow-hidden mb-2">
            <WordReveal text="Nova cidade." delay={0.2} />
          </div>
          <div className="overflow-hidden">
            <span className="overflow-hidden inline-block">
              {['Mesmo', 'nível.'].map((word, i) => (
                <span key={i} className="inline-block overflow-hidden">
                  <motion.em
                    className="inline-block italic text-[var(--accent)]"
                    initial={{ y: '110%', opacity: 0 }}
                    whileInView={{ y: '0%', opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.55 + i * 0.12, ease }}
                  >
                    {word}{i === 0 ? '\u00a0' : ''}
                  </motion.em>
                </span>
              ))}
            </span>
          </div>
        </div>

        <ScrollReveal delay={0.7}>
          <p className="text-[var(--text-2)] text-base md:text-lg max-w-lg mx-auto leading-[1.85] mb-12">
            A próxima edição do Wealth & Wellness Connect está sendo planejada.
            Cidade e data em breve.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.85}>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="flex items-center gap-3">
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-40" />
                <div className="absolute inset-0 rounded-full bg-[var(--accent)]" />
              </div>
              <span className="text-[var(--text-1)] text-sm font-medium">Vagas limitadas a 40 participantes</span>
            </div>
            <a
              href="#interesse"
              className="btn-glow inline-flex items-center gap-3 px-10 py-4 bg-[var(--accent)] text-[var(--bg)] text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-transparent hover:text-[var(--accent)] border border-[var(--accent)] transition-all duration-500"
            >
              Garantir meu lugar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

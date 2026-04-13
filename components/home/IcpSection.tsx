'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { ICP_BULLETS } from '@/lib/constants';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── Animated check SVG (stroke-dasharray draw-on) ── */
function AnimatedCheck({ inView }: { inView: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-5 h-5 mt-0.5 shrink-0 text-[var(--accent)]"
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' } as React.CSSProperties}
    >
      <motion.path
        d="M5 12l5 5L20 7"
        strokeDasharray="30"
        initial={{ strokeDashoffset: 30 }}
        animate={inView ? { strokeDashoffset: 0 } : { strokeDashoffset: 30 }}
        transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
      />
    </motion.svg>
  );
}

/* ── Animated bullet item ── */
function BulletItem({ text, index }: { text: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-5%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -28 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -28 }}
      transition={{ duration: 0.6, delay: index * 0.09, ease }}
      whileHover={{ x: 8, borderColor: 'rgba(201, 168, 76, 0.25)' }}
      className="flex gap-4 py-5 border-b border-[var(--border)] last:border-b-0 cursor-default"
    >
      <AnimatedCheck inView={isInView} />
      <p className="text-[var(--text-2)] text-sm leading-[1.75]">{text}</p>
    </motion.div>
  );
}

/* ── Marquee participants grid ── */
function ParticipantsMarquee() {
  return (
    <div className="relative mt-10 h-[120px] overflow-hidden rounded-sm">
      {/* Two copies side-by-side scrolling */}
      <motion.div
        className="flex h-full"
        animate={{ x: [0, '-50%'] }}
        transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
        style={{ width: '200%' }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="relative flex-1 h-full" style={{ minWidth: '50%' }}>
            <Image
              src="/photos/participants-grid.jpg"
              alt={copy === 0 ? 'Participantes do WWC' : ''}
              fill
              sizes="(max-width: 768px) 200vw, 100vw"
              className="object-cover object-top"
              quality={85}
            />
          </div>
        ))}
      </motion.div>
      {/* Edge fades */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-transparent to-[var(--bg)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/80 to-transparent pointer-events-none" />
    </div>
  );
}

/* ── Word-by-word fade blockquote ── */
function FadeInWords({ text }: { text: string }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-5%' });
  const words = text.split(' ');

  return (
    <blockquote
      ref={ref}
      className="text-[var(--text-3)] text-[15px] leading-[1.85] italic border-l-2 border-[var(--accent)]/30 pl-6"
    >
      &ldquo;
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.35, delay: 0.2 + i * 0.04, ease }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
      &rdquo;
    </blockquote>
  );
}

export function IcpSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  return (
    <section ref={ref} className="py-28 md:py-40 relative overflow-hidden">
      {/* Background photo — audience, blended */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <Image
          src="/photos/audience-view.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.09]"
          quality={50}
        />
      </motion.div>
      <div className="absolute inset-0 bg-[var(--bg)]/75" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-transparent to-[var(--bg)]" />

      <div className="container-lp relative z-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20">
          {/* Left */}
          <div>
            <ScrollReveal>
              <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-8 flex items-center gap-4">
                <span className="inline-block w-12 h-px bg-[var(--accent)]" />
                Para quem é
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.98] tracking-[-0.03em] mb-8">
                Exclusivo.{' '}
                <em className="italic text-[var(--accent)]">Por convite.</em>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-[var(--text-2)] text-base leading-[1.85] mb-8">
                O evento é exclusivo e curado. Selecionamos criteriosamente cada participante
                para garantir que o networking seja tão valioso quanto o conteúdo.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <FadeInWords text="Se você reconhece que performance sustentável é tão importante quanto resultado financeiro, esse evento é pra você." />
            </ScrollReveal>

            {/* Participants grid — marquee horizontal scroll */}
            <ScrollReveal delay={0.4}>
              <ParticipantsMarquee />
            </ScrollReveal>
          </div>

          {/* Right — bullets: slide from left + animated SVG check */}
          <div className="flex flex-col justify-center">
            {ICP_BULLETS.map((bullet, i) => (
              <BulletItem key={i} text={bullet} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

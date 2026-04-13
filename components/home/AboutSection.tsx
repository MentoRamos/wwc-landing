'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { EVENT } from '@/lib/constants';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Smooth spring-wrapped parallax
  const rawImgY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const imgY = useSpring(rawImgY, { stiffness: 60, damping: 20, mass: 0.8 });

  const rawImgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1.02, 1]);
  const imgScale = useSpring(rawImgScale, { stiffness: 60, damping: 20, mass: 0.8 });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.06, 0.06, 0]);

  // Spring-smoothed parallax for floating accents
  const rawAccentY1 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const accentY1 = useSpring(rawAccentY1, { stiffness: 40, damping: 15, mass: 1 });
  const rawAccentY2 = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const accentY2 = useSpring(rawAccentY2, { stiffness: 40, damping: 15, mass: 1 });

  return (
    <section id="sobre" ref={sectionRef} className="py-28 md:py-44 relative overflow-hidden">
      {/* CSS keyframes for float animation and shimmer */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(6px) rotate(-0.5deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(8px) rotate(-1.5deg); }
          70% { transform: translateY(-6px) rotate(0.8deg); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(350%) skewX(-20deg); opacity: 0; }
        }
        @keyframes revealWidth {
          from { width: 0; opacity: 0; }
          to { width: 4rem; opacity: 1; }
        }
        .accent-float-a {
          animation: floatA 6s ease-in-out infinite;
          will-change: transform;
        }
        .accent-float-b {
          animation: floatB 8s ease-in-out infinite;
          animation-delay: -2s;
          will-change: transform;
        }
        .shimmer-group:hover .shimmer-sweep {
          animation: shimmerSweep 0.85s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .divider-reveal {
          animation: revealWidth 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-play-state: paused;
        }
        .divider-reveal.in-view {
          animation-play-state: running;
        }
      `}</style>

      {/* Background photo — networking, faded into bg */}
      <div className="absolute inset-0">
        <Image
          src="/photos/networking.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.08]"
          quality={50}
        />
        <div className="absolute inset-0 bg-[var(--bg)]/80" />
      </div>

      {/* Gold ambient */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 70% 50%, #C9A84C, transparent)' }} />
      </motion.div>

      {/* Vertical accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-28 bg-gradient-to-b from-transparent via-[var(--accent)]/20 to-transparent" />

      <div className="container-lp relative z-10">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-16 md:gap-24 items-center">
          {/* Text */}
          <div>
            <ScrollReveal>
              <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-8 flex items-center gap-4">
                <span className="inline-block w-12 h-px bg-[var(--accent)]" />
                Sobre o evento
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-4xl md:text-5xl lg:text-[3.75rem] leading-[0.98] tracking-[-0.03em] mb-10">
                Saúde não é mais{' '}
                <br className="hidden sm:block" />
                <em className="italic text-[var(--accent)]">intuição.</em>
                <br />
                É dado.
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              {/* Divider line with reveal animation */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: '4rem', opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="h-px bg-[var(--accent)] mb-8"
                style={{ willChange: 'width' }}
              />
              <p className="text-[var(--text-2)] text-base md:text-[17px] leading-[1.85] mb-8">
                {EVENT.description}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="text-[var(--text-3)] text-[15px] leading-[1.85]">
                Curado para no máximo <strong className="text-[var(--accent)] font-medium">40 convidados</strong>,
                o WWC oferece networking estratégico com coquetel premium, conteúdo actionable
                com dados reais, e conexões que vão além do evento.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="flex gap-10 mt-12 pt-8 border-t border-[var(--border)]">
                {[
                  { label: 'Formato', value: 'Presencial' },
                  { label: 'Duração', value: EVENT.edition1.duration },
                  { label: 'Vagas', value: `${EVENT.edition1.attendees}` },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 + i * 0.1, ease }}
                  >
                    <div className="text-[9px] tracking-[0.3em] uppercase text-[var(--text-4)] mb-2">
                      {item.label}
                    </div>
                    <div className="font-display text-2xl text-[var(--accent)]">
                      {item.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Badge image with parallax, spring smoothing, and shimmer */}
          <div ref={imgRef} className="relative flex justify-center md:justify-end">
            <motion.div
              style={{ y: imgY, scale: imgScale }}
              className="shimmer-group relative w-full max-w-[420px] aspect-[3/4.2] overflow-hidden group cursor-default"
              whileHover="hover"
            >
              <Image
                src="/photos/kaua-portrait-color.jpg"
                alt="Kauã Ramos — Host & Curador do WWC"
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                quality={90}
                style={{ willChange: 'transform' }}
              />
              {/* Blend edges into background */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[var(--bg)]/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/40 via-transparent to-[var(--bg)]/40" />
              {/* Gold border frame */}
              <div className="absolute inset-0 border border-[var(--accent)]/10 group-hover:border-[var(--accent)]/25 transition-colors duration-500" />
              {/* Shimmer sweep overlay */}
              <div
                className="shimmer-sweep absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(201,168,76,0.18) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)',
                  transform: 'translateX(-150%) skewX(-20deg)',
                  willChange: 'transform',
                }}
              />
            </motion.div>

            {/* Floating accent elements — CSS float animation + spring parallax layered */}
            <motion.div
              style={{ y: accentY1 }}
              className="absolute -bottom-6 -left-6 w-24 h-24 hidden md:block"
            >
              <div
                className="accent-float-a w-full h-full border border-[var(--accent)]/10"
                style={{ willChange: 'transform' }}
              />
            </motion.div>
            <motion.div
              style={{ y: accentY2 }}
              className="absolute -top-4 -right-4 w-16 h-16 hidden md:block"
            >
              <div
                className="accent-float-b w-full h-full border border-[var(--accent)]/8"
                style={{ willChange: 'transform' }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

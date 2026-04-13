'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';

const PHOTOS = [
  { src: '/photos/hero-keynote.jpg', alt: 'Keynote — Wealth & Wellness Connect', span: 'col-span-1 row-span-1 sm:col-span-2 sm:row-span-2' },
  { src: '/photos/kaua-portrait-seated.jpg', alt: 'Kauã Ramos — Host & Curador', span: 'col-span-1 row-span-1 sm:col-span-1 sm:row-span-2' },
  { src: '/photos/audience-view.jpg', alt: 'Plateia do evento', span: 'col-span-1 row-span-1' },
  { src: '/photos/kaua-portrait-close.jpg', alt: 'Kauã Ramos — Portrait', span: 'col-span-1 row-span-1' },
  { src: '/photos/networking.jpg', alt: 'Networking entre convidados', span: 'col-span-1 row-span-1' },
  { src: '/photos/kaua-laughing.jpg', alt: 'Momentos do evento', span: 'col-span-1 row-span-1' },
  { src: '/photos/conversation.jpg', alt: 'Conversas pós-evento', span: 'col-span-1 row-span-1 sm:col-span-2 sm:row-span-1' },
];

function ParallaxImage({ src, alt, span, index }: { src: string; alt: string; span: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Varied parallax depth per item for editorial feel
  const parallaxStrength = [40, 20, 55, 25, 35][index] ?? 30;
  const y = useTransform(scrollYProgress, [0, 1], [parallaxStrength, -parallaxStrength]);

  // Ken Burns: subtle continuous zoom tied to scroll
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.18, 1.07, 1.0]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`${span} relative overflow-hidden group cursor-pointer`}
    >
      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 z-10 bg-[#141414] overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.06) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Ken Burns image wrapper */}
      <motion.div
        style={{ scale: imgScale }}
        className="absolute inset-0 will-change-transform"
      >
        {/* Extra Ken Burns on hover via CSS */}
        <div className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-cover transition-[filter,opacity] duration-700 group-hover:brightness-110 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            quality={90}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEElEQVQImWNgIAz4TwAGAAQAAS8BKO9bAAAAAElFTkSuQmCC"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </motion.div>

      {/* Dark overlay — lifts on hover */}
      <div className="absolute inset-0 bg-[#0C0C0C]/10 group-hover:bg-[#0C0C0C]/0 transition-all duration-700" />

      {/* Golden border glow — appears on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
      >
        {/* Inner glow ring */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            boxShadow: 'inset 0 0 0 1.5px #C9A84C, inset 0 0 24px rgba(201,168,76,0.18)',
          }}
        />
      </motion.div>

      {/* Corner accent lines — editorial flair */}
      <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <span className="absolute top-0 left-0 w-full h-px bg-[#C9A84C]" />
        <span className="absolute top-0 left-0 w-px h-full bg-[#C9A84C]" />
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <span className="absolute bottom-0 right-0 w-full h-px bg-[#C9A84C]" />
        <span className="absolute bottom-0 right-0 w-px h-full bg-[#C9A84C]" />
      </div>

      {/* Bottom gradient for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0C0C0C]/40 to-transparent" />

      {/* Caption fade-in on hover */}
      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
        <span className="text-[9px] tracking-[0.2em] uppercase text-[#C9A84C]/80">{alt}</span>
      </div>
    </motion.div>
  );
}

export function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.03, 0.03, 0]);

  return (
    <section id="galeria" ref={sectionRef} className="py-24 md:py-36 relative overflow-hidden">
      {/* Background — event keynote, blended */}
      <div className="absolute inset-0">
        <Image src="/photos/audience-view.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.12]" quality={50} />
        <div className="absolute inset-0 bg-[var(--bg)]/70" />
      </div>

      {/* Ambient gold glow */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0"
      >
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, #C9A84C, transparent)' }}
        />
      </motion.div>

      {/* Shimmer keyframes injected once */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className="container-lp relative z-10">
        {/* Header + context — full width, no empty space */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 mb-12">
          {/* Left — title + narrative */}
          <div>
            <ScrollReveal>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--accent)] mb-5 flex items-center gap-3">
                <span className="inline-block w-10 h-px bg-[var(--accent)]" />
                1ª Edição — Goiânia
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[0.96] tracking-[-0.03em] mb-8">
                O que{' '}
                <em className="italic text-[var(--accent)]">aconteceu.</em>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-[var(--text-2)] text-base md:text-lg leading-[1.85] mb-6">
                Uma noite que reuniu os principais nomes de Goiânia em torno de uma premissa simples:
                {' '}<strong className="text-[var(--text-1)] font-medium">quem mede, performa melhor.</strong>
              </p>
              <p className="text-[var(--text-3)] text-base leading-[1.85]">
                13 de março de 2026 — Legado, Ricardo Paranhos.
                3h15 de conteúdo prático, dados reais e conexões que transcenderam o evento.
              </p>
            </ScrollReveal>
          </div>

          {/* Right — stats + quote */}
          <div className="flex flex-col justify-between gap-8">
            <ScrollReveal delay={0.25}>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: '40', label: 'CEOs e executivos presentes' },
                  { value: '6', label: 'Blocos de conteúdo prático' },
                  { value: '92%', label: 'Querem voltar na 2ª edição' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center md:text-left">
                    <span className="font-display text-3xl md:text-4xl text-[var(--accent)] leading-none">{stat.value}</span>
                    <p className="text-[var(--text-3)] text-xs mt-2 leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <blockquote className="text-[var(--text-2)] text-base md:text-lg leading-[1.75] italic border-l-2 border-[var(--accent)]/40 pl-6">
                &ldquo;Não foi palestra motivacional — foi dado real, protocolo aplicável
                e gente que realmente faz acontecer na mesma sala.&rdquo;
              </blockquote>
              <p className="text-[var(--text-4)] text-[10px] tracking-[0.2em] uppercase mt-4 pl-6">
                — Participante, CEO setor imobiliário
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[var(--border)] mb-10" />

        {/* Dynamic grid — asymmetric, editorial layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[180px] sm:auto-rows-[250px] lg:auto-rows-[280px] gap-3 md:gap-4">
          {PHOTOS.map((photo, i) => (
            <ScrollReveal key={photo.src} delay={i * 0.1}>
              <ParallaxImage
                src={photo.src}
                alt={photo.alt}
                span={photo.span}
                index={i}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

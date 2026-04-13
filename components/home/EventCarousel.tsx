'use client';

import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

const SLIDES = [
  { src: '/photos/hero-keynote.jpg', alt: 'Keynote WWC' },
  { src: '/photos/presenting.jpg', alt: 'Apresentação no palco' },
  { src: '/photos/audience-view.jpg', alt: 'Plateia do evento' },
  { src: '/photos/networking.jpg', alt: 'Networking premium' },
  { src: '/photos/conversation.jpg', alt: 'Conversas estratégicas' },
  { src: '/photos/participants-grid.jpg', alt: 'Participantes' },
  { src: '/photos/kaua-portrait-seated.jpg', alt: 'Kauã Ramos — Host' },
  { src: '/photos/kaua-presenting.jpg', alt: 'Host apresentando' },
  { src: '/photos/kaua-laughing.jpg', alt: 'Momentos do evento' },
  { src: '/photos/kaua-fullbody.jpg', alt: 'Bastidores' },
  { src: '/photos/kaua-hands.jpg', alt: 'Conexões' },
  { src: '/photos/kaua-pointing.jpg', alt: 'Engajamento' },
];

export function EventCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const controls = useAnimationControls();

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused]);

  // Scroll to active slide
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[active] as HTMLElement;
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - 40, behavior: 'smooth' });
  }, [active]);

  function goTo(i: number) {
    setActive(i);
    setPaused(true);
    setTimeout(() => setPaused(false), 6000);
  }

  function next() { goTo((active + 1) % SLIDES.length); }
  function prev() { goTo((active - 1 + SLIDES.length) % SLIDES.length); }

  return (
    <section className="py-0 relative overflow-hidden bg-[var(--bg)]">
      {/* Subtle top/bottom fade */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--bg)] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent z-10 pointer-events-none" />

      <div className="container-lp relative z-10 py-8 md:py-12">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-4)] flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[var(--accent)]/40" />
            Momentos da 1ª Edição
          </p>

          {/* Nav arrows */}
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-9 h-9 border border-[var(--border)] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all duration-300"
              aria-label="Anterior"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={next}
              className="w-9 h-9 border border-[var(--border)] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all duration-300"
              aria-label="Próximo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setTimeout(() => setPaused(false), 4000)}
        >
          {SLIDES.map((slide, i) => (
            <motion.div
              key={slide.src}
              onClick={() => goTo(i)}
              className={`relative flex-shrink-0 snap-start cursor-pointer overflow-hidden transition-all duration-500 ${
                i === active
                  ? 'w-[70vw] md:w-[45vw] lg:w-[35vw] h-[50vw] md:h-[28vw] lg:h-[22vw]'
                  : 'w-[35vw] md:w-[22vw] lg:w-[17vw] h-[50vw] md:h-[28vw] lg:h-[22vw] opacity-50'
              }`}
              animate={{
                scale: i === active ? 1 : 0.95,
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 768px) 70vw, 35vw"
                className="object-cover transition-transform duration-700"
                quality={85}
              />

              {/* Active golden border */}
              {i === active && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 border border-[var(--accent)]/30"
                />
              )}

              {/* Bottom gradient + caption */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
              <div className={`absolute bottom-3 left-4 right-4 transition-opacity duration-500 ${i === active ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--accent)]">{slide.alt}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === active
                  ? 'bg-[var(--accent)] w-8'
                  : 'bg-[var(--text-4)]/20 w-3 hover:bg-[var(--text-4)]/40'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}

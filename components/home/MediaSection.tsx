'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ScrollReveal } from '@/components/animations/ScrollReveal';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MEDIA = [
  { src: '/photos/evento-plateia-legado.jpg', alt: 'Plateia — Espaço Legado', type: 'photo' as const },
  { src: '/photos/evento-painel.jpg', alt: 'Painel de discussão', type: 'photo' as const },
  { src: '/photos/evento-aplausos.jpg', alt: 'Aplausos da plateia', type: 'photo' as const },
  { src: '/photos/evento-grupo.jpg', alt: 'Networking VIP', type: 'photo' as const },
  { src: '/photos/evento-palco-tela.jpg', alt: 'Palco & apresentação', type: 'photo' as const },
  { src: '/photos/evento-celular.jpg', alt: 'Registrando o momento', type: 'photo' as const },
  { src: '/photos/evento-kaua-convidado.jpg', alt: 'Host & convidado', type: 'photo' as const },
  { src: '/photos/evento-trio-gift.jpg', alt: 'Entrega de gifts', type: 'photo' as const },
  { src: '/photos/evento-kaua-networking.jpg', alt: 'Networking pós-evento', type: 'photo' as const },
  { src: '/photos/evento-trio.jpg', alt: 'Conexões que ficam', type: 'photo' as const },
  { src: '/photos/evento-plateia-close.jpg', alt: 'Convidados atentos', type: 'photo' as const },
  { src: '/video/wwc-highlight.mp4', alt: 'Vídeo highlight da 1ª edição', type: 'video' as const },
];

const TABS = [
  { key: 'all' as const, label: 'Todos' },
  { key: 'photo' as const, label: 'Fotos' },
  { key: 'video' as const, label: 'Vídeo' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.35, ease }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2.5 px-5 py-3 bg-[#1a1a1a] border border-[#C9A84C]/40 text-[#C9A84C] text-[11px] tracking-[0.18em] uppercase shadow-xl shadow-black/50 backdrop-blur-md"
        >
          {/* Checkmark */}
          <motion.svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#C9A84C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <path d="M2.5 8.5l3.5 3.5 7-7" />
          </motion.svg>
          Download iniciado
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Image card with skeleton shimmer ────────────────────────────────────────
function MediaCard({
  item,
  onClick,
}: {
  item: typeof MEDIA[number];
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Skeleton shimmer */}
      {!loaded && item.type === 'photo' && (
        <div className="absolute inset-0 z-10 bg-[#141414] overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.07) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {item.type === 'video' ? (
        <div className="absolute inset-0 bg-[var(--bg-card)] flex flex-col items-center justify-center">
          {/* Pulse rings */}
          <div className="relative flex items-center justify-center mb-3">
            <span className="absolute w-16 h-16 rounded-full bg-[#C9A84C]/10 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="absolute w-20 h-20 rounded-full bg-[#C9A84C]/5 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.3s' }} />
            <div className="relative w-16 h-16 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center group-hover:bg-[#C9A84C]/20 group-hover:scale-110 transition-all duration-500">
              <svg viewBox="0 0 24 24" fill="#C9A84C" className="w-6 h-6 ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-3)]">Vídeo</span>
        </div>
      ) : (
        <>
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            quality={85}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEElEQVQImWNgIAz4TwAGAAQAAS8BKO9bAAAAAElFTkSuQmCC"
            onLoad={() => setLoaded(true)}
          />
          {/* Hover overlay + expand icon */}
          <div className="absolute inset-0 bg-[#0C0C0C]/0 group-hover:bg-[#0C0C0C]/30 transition-all duration-500 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom label */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-white text-[10px] tracking-wide">{item.alt}</span>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  index,
  onClose,
  onNav,
}: {
  index: number;
  onClose: () => void;
  onNav: (next: number) => void;
}) {
  const item = MEDIA[index];
  const dragX = useMotionValue(0);
  const bgOpacity = useTransform(dragX, [-200, 0, 200], [0.6, 1, 0.6]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1);
      if (e.key === 'ArrowRight' && index < MEDIA.length - 1) onNav(index + 1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, onClose, onNav]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    const threshold = 80;
    if (info.offset.x < -threshold && index < MEDIA.length - 1) {
      onNav(index + 1);
    } else if (info.offset.x > threshold && index > 0) {
      onNav(index - 1);
    }
    animate(dragX, 0, { duration: 0.3 });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
    >
      {/* Animated bg dim tied to drag */}
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: useTransform(bgOpacity, (v) => 1 - v) }} />

      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease }}
        className="relative max-w-5xl w-full max-h-[90vh] z-10"
        onClick={(e) => e.stopPropagation()}
        drag={item.type === 'photo' ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, cursor: item.type === 'photo' ? 'grab' : 'auto' }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease }}
          >
            {item.type === 'video' ? (
              <video controls autoPlay className="w-full max-h-[80vh] object-contain rounded-sm">
                <source src={item.src} type="video/mp4" />
              </video>
            ) : (
              <div className="relative w-full aspect-[4/3]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  quality={95}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Controls row */}
        <div className="flex items-center justify-between mt-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-white/60 text-sm truncate">{item.alt}</p>
            {/* Dot indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {MEDIA.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNav(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === index
                      ? 'w-4 h-1.5 bg-[#C9A84C]'
                      : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {item.type === 'photo' && (
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = item.src;
                  a.download = item.alt.replace(/\s+/g, '-') + '.jpg';
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white/80 text-xs hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Salvar
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white/80 text-xs hover:bg-white/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Fechar
            </button>
          </div>
        </div>

        {/* Nav arrows */}
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
            className="absolute left-0 top-[45%] -translate-y-1/2 -translate-x-full md:-translate-x-16 w-11 h-11 flex items-center justify-center bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all duration-200 rounded-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {index < MEDIA.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
            className="absolute right-0 top-[45%] -translate-y-1/2 translate-x-full md:translate-x-16 w-11 h-11 flex items-center justify-center bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all duration-200 rounded-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Swipe hint — mobile only, first open */}
        <motion.p
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2, duration: 1 }}
          className="sm:hidden absolute inset-x-0 -bottom-8 text-center text-[9px] tracking-[0.2em] uppercase text-white/30"
        >
          Deslize para navegar
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MediaSection() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = filter === 'all' ? MEDIA : MEDIA.filter((m) => m.type === filter);

  function download(src: string, name: string) {
    const a = document.createElement('a');
    a.href = src;
    a.download = name;
    a.click();
  }

  function showToast() {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2800);
  }

  const handleNav = useCallback((next: number) => setLightbox(next), []);

  return (
    <section id="midia" className="py-28 md:py-40 border-t border-[var(--border)] relative overflow-hidden">
      {/* Grain */}
      <div className="absolute inset-0 grain pointer-events-none" />

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className="container-lp relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <ScrollReveal>
              <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--accent)] mb-6 flex items-center gap-4">
                <span className="inline-block w-12 h-px bg-[var(--accent)]" />
                Mídia — 1ª Edição
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-3xl md:text-5xl leading-[0.98] tracking-[-0.03em]">
                Reviva o{' '}
                <em className="italic text-[var(--accent)]">momento.</em>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className="text-[var(--text-3)] text-sm mt-4 max-w-md">
                Fotos e vídeos da 1ª edição. Clique para ampliar, salve e compartilhe nas redes.
              </p>
            </ScrollReveal>
          </div>

          {/* Filter tabs with animated sliding underline */}
          <ScrollReveal delay={0.2}>
            <div className="relative flex gap-0">
              {TABS.map((tab, i) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`relative px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase border-t border-b border-r transition-colors duration-200 ${
                      i === 0 ? 'border-l' : ''
                    } ${
                      isActive
                        ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/5'
                        : 'border-[var(--border)] text-[var(--text-4)] hover:text-[var(--text-2)]'
                    }`}
                  >
                    {tab.label}
                    {/* Animated underline indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[#C9A84C]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollReveal>
        </div>

        {/* Media grid */}
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.src}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease }}
              >
                <MediaCard
                  item={item}
                  onClick={() => setLightbox(MEDIA.indexOf(item))}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Download all CTA */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-[var(--text-3)] text-sm">Salve e compartilhe nas suas redes</p>
            <button
              onClick={() => {
                MEDIA.filter((m) => m.type === 'photo').forEach((m) => {
                  download(m.src, m.alt.replace(/\s+/g, '-').toLowerCase() + '.jpg');
                });
                showToast();
              }}
              className="btn-glow inline-flex items-center gap-3 px-6 py-3 border border-[var(--accent)] text-[var(--accent)] text-[10px] tracking-[0.22em] uppercase hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-all duration-500"
            >
              <motion.span
                whileTap={{ y: [0, 4, 0] }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Baixar todas as fotos
              </motion.span>
            </button>
          </div>
        </ScrollReveal>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox
            index={lightbox}
            onClose={() => setLightbox(null)}
            onNav={handleNav}
          />
        )}
      </AnimatePresence>

      {/* Download toast */}
      <Toast visible={toast} />
    </section>
  );
}

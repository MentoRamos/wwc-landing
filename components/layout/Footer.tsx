'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Logo } from '@/components/ui/Logo';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function BackToTop() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <motion.button
      onClick={scrollToTop}
      className="group flex flex-col items-center gap-2 text-[var(--text-4)] hover:text-[var(--accent)] transition-colors duration-300"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.25, ease }}
      aria-label="Voltar ao topo"
    >
      <motion.div
        className="w-9 h-9 border border-[var(--border)] group-hover:border-[var(--accent)]/50 flex items-center justify-center transition-colors duration-300"
        whileHover={{ borderColor: '#C9A84C80' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <span className="text-[9px] tracking-[0.22em] uppercase">Topo</span>
    </motion.button>
  );
}

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

// Animated gold separator line
function GoldSeparator() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative w-full h-px overflow-hidden my-2">
      {/* Base border */}
      <div className="absolute inset-0 bg-[var(--border)]" />
      {/* Animated gold sweep */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #C9A84C80 40%, #C9A84C 50%, #C9A84C80 60%, transparent 100%)',
          width: '60%',
        }}
        initial={{ x: '-100%' }}
        animate={inView ? { x: '250%' } : {}}
        transition={{ duration: 1.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  };

  return (
    <footer ref={ref} className="border-t border-[var(--border)] py-14 md:py-20">
      <div className="container-lp">
        <motion.div
          className="flex flex-col items-center gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {/* Logo */}
          <motion.div variants={itemVariants}>
            <Logo size={140} />
          </motion.div>

          {/* Gold separator */}
          <motion.div variants={itemVariants} className="w-full max-w-sm">
            <GoldSeparator />
          </motion.div>

          {/* Nav */}
          <motion.nav
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-[var(--text-4)] text-[11px] tracking-[0.15em] uppercase"
          >
            <a href="#sobre" className="hover:text-[var(--accent)] transition-colors duration-300">Sobre</a>
            <span className="w-1 h-1 rounded-full bg-[var(--accent)]/30" />
            <a href="#programacao" className="hover:text-[var(--accent)] transition-colors duration-300">Programação</a>
            <span className="w-1 h-1 rounded-full bg-[var(--accent)]/30" />
            <a href="#midia" className="hover:text-[var(--accent)] transition-colors duration-300">Mídia</a>
            <span className="w-1 h-1 rounded-full bg-[var(--accent)]/30" />
            <a href="#interesse" className="hover:text-[var(--accent)] transition-colors duration-300">Participar</a>
          </motion.nav>

          {/* Social links */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-9 h-9 border border-[var(--border)] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all duration-300"
                whileHover={{ scale: 1.08, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.22, ease }}
              >
                {social.icon}
              </motion.a>
            ))}
          </motion.div>

          {/* Bottom row: copyright + back to top */}
          <motion.div
            variants={itemVariants}
            className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 pt-2"
          >
            <p className="text-[var(--text-4)] text-[10px] tracking-[0.25em] uppercase order-2 sm:order-1">
              &copy; {new Date().getFullYear()} UWell Health Club — Todos os direitos reservados
            </p>
            <div className="order-1 sm:order-2">
              <BackToTop />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}

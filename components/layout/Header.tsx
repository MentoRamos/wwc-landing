'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

const NAV_LINKS = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Programação', href: '#programacao' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Mídia', href: '#midia' },
  { label: 'Palestrantes', href: '#palestrantes' },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Section IDs to detect active nav link
const SECTION_IDS = NAV_LINKS.map((l) => l.href.replace('#', ''));

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Smooth scroll progress via motion value
  const scrollY = useMotionValue(0);
  const smoothScrolled = useSpring(scrollY, { stiffness: 180, damping: 30 });

  // Logo scale/opacity based on scroll
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(1);

  useEffect(() => {
    function onScroll() {
      scrollY.set(window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollY]);

  useMotionValueEvent(smoothScrolled, 'change', (latest) => {
    const isScrolled = latest > 60;
    setScrolled(isScrolled);
    // Logo subtle scale on scroll
    const progress = Math.min(latest / 120, 1);
    setLogoScale(1 - progress * 0.1);
    setLogoOpacity(1 - progress * 0.15);
  });

  // Intersection Observer for active section detection
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.35, rootMargin: '-80px 0px -20% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.2, ease }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
        scrolled
          ? 'bg-[var(--bg)]/90 backdrop-blur-xl border-b border-[var(--border)] py-0'
          : 'bg-transparent py-2'
      }`}
    >
      <div className="container-lp flex items-center justify-between h-[var(--header-height)]">
        <a href="#" className="flex items-center gap-3 group">
          <motion.div
            style={{ scale: logoScale, opacity: logoOpacity }}
            whileHover={{ scale: logoScale * 1.05 }}
            transition={{ duration: 0.35, ease }}
          >
            <Logo size={scrolled ? 100 : 120} />
          </motion.div>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link, i) => {
            const sectionId = link.href.replace('#', '');
            const isActive = activeSection === sectionId;
            return (
              <motion.a
                key={link.href}
                href={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease }}
                className="relative text-[11px] tracking-[0.2em] uppercase py-2 group transition-colors duration-300"
                style={{ color: isActive ? '#C9A84C' : 'var(--text-3)' }}
              >
                {link.label}
                {/* Hover underline */}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-[var(--accent)] group-hover:w-full transition-all duration-500" />
                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    layoutId="active-dot"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.a>
            );
          })}
          <motion.a
            href="#interesse"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, ease }}
            className="btn-glow inline-flex items-center px-6 py-2.5 border border-[var(--accent)] text-[var(--accent)] text-[10px] tracking-[0.22em] uppercase hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-all duration-500"
          >
            Quero participar
          </motion.a>
        </nav>

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Menu"
        >
          <motion.span
            className="block w-6 h-px bg-[var(--text-1)] origin-center"
            animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 3.5 : 0 }}
            transition={{ duration: 0.28, ease }}
          />
          <motion.span
            className="block w-6 h-px bg-[var(--text-1)] origin-center"
            animate={{ opacity: mobileOpen ? 0 : 1, scaleX: mobileOpen ? 0 : 1 }}
            transition={{ duration: 0.22, ease }}
          />
          <motion.span
            className="block w-6 h-px bg-[var(--text-1)] origin-center"
            animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -3.5 : 0 }}
            transition={{ duration: 0.28, ease }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 top-[var(--header-height)] bg-[var(--bg)]/60 backdrop-blur-sm z-[-1]"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              key="menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.38, ease }}
              className="md:hidden overflow-hidden bg-[var(--bg)]/97 backdrop-blur-2xl border-b border-[var(--border)]"
            >
              <div className="container-lp flex flex-col gap-1 py-4">
                {NAV_LINKS.map((link, i) => {
                  const sectionId = link.href.replace('#', '');
                  const isActive = activeSection === sectionId;
                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.3, delay: i * 0.06, ease }}
                      className="text-[13px] tracking-[0.15em] uppercase py-3.5 border-b border-[var(--border)]/50 transition-colors duration-300 flex items-center justify-between"
                      style={{ color: isActive ? '#C9A84C' : 'var(--text-2)' }}
                    >
                      {link.label}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </motion.a>
                  );
                })}
                <motion.a
                  href="#interesse"
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, delay: 0.32, ease }}
                  className="btn-glow inline-flex items-center justify-center min-h-[48px] px-6 py-3.5 border border-[var(--accent)] text-[var(--accent)] text-[11px] tracking-[0.22em] uppercase hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-all duration-500 mt-3"
                >
                  Quero participar
                </motion.a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

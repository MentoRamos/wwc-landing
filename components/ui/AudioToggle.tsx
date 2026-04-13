'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
const TARGET_VOLUME = 0.35;

export function AudioToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const setAudioEl = useCallback((el: HTMLAudioElement | null) => {
    if (!el) return;
    audioRef.current = el;
    el.volume = 0;
    el.addEventListener('canplaythrough', () => setReady(true), { once: true });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      let vol = audio.volume;
      const fade = setInterval(() => {
        vol = Math.max(0, vol - 0.025);
        audio.volume = vol;
        if (vol <= 0) {
          clearInterval(fade);
          audio.pause();
          setPlaying(false);
        }
      }, 25);
    } else {
      audio.volume = 0;
      audio.play()
        .then(() => {
          let vol = 0;
          const fade = setInterval(() => {
            vol = Math.min(TARGET_VOLUME, vol + 0.02);
            audio.volume = vol;
            if (vol >= TARGET_VOLUME) clearInterval(fade);
          }, 25);
          setPlaying(true);
        })
        .catch(() => {
          setShowTooltip(true);
          setTimeout(() => setShowTooltip(false), 3000);
        });
    }
  }, [playing]);

  return (
    <>
      {/* Audio element — MP3 extracted from event video */}
      <audio
        ref={setAudioEl}
        src="/audio/wwc-audio.mp3"
        loop
        preload="auto"
      />

      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3">
        <motion.button
          onClick={toggle}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: ready ? 1 : 0.4, scale: 1 }}
          transition={{ delay: 3, duration: 0.6, ease }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`audio-btn ${playing ? 'playing' : ''}`}
          aria-label={playing ? 'Pausar áudio ambiente' : 'Tocar áudio ambiente'}
          disabled={!ready}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {/* Equalizer bars when playing */}
          <AnimatePresence>
            {playing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-1 -right-1 flex gap-[2px]"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] bg-[var(--accent)] rounded-full"
                    animate={{ height: ['4px', '10px', '6px', '12px', '4px'] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.3, ease }}
              className="glass px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase text-[var(--text-3)] whitespace-nowrap"
            >
              {playing ? 'Áudio do evento' : 'Ouvir áudio do evento'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

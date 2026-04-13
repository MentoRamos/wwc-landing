'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
const TARGET_VOLUME = 0.35;

export function AudioToggle() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Ref callback — runs once when the hidden <video> mounts
  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    videoRef.current = el;
    el.volume = 0;
    // Mark ready as soon as browser has enough data
    el.addEventListener('canplay', () => setReady(true), { once: true });
  }, []);

  const toggle = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (playing) {
      // Fade out then pause
      let vol = vid.volume;
      const fade = setInterval(() => {
        vol = Math.max(0, vol - 0.025);
        vid.volume = vol;
        if (vol <= 0) {
          clearInterval(fade);
          vid.pause();
          setPlaying(false);
        }
      }, 25);
    } else {
      vid.volume = 0;
      vid.play()
        .then(() => {
          // Fade in
          let vol = 0;
          const fade = setInterval(() => {
            vol = Math.min(TARGET_VOLUME, vol + 0.02);
            vid.volume = vol;
            if (vol >= TARGET_VOLUME) clearInterval(fade);
          }, 25);
          setPlaying(true);
        })
        .catch(() => {
          // Browser blocked — tooltip hint
          setShowTooltip(true);
          setTimeout(() => setShowTooltip(false), 3000);
        });
    }
  }, [playing]);

  return (
    <>
      {/* Hidden video — only the audio track matters.
          Rendered in DOM (not createElement) so the click event
          on the button counts as a user gesture for autoplay policy. */}
      {/* Hidden via size+position, NOT display:none —
          display:none prevents the browser from loading/playing the media */}
      <video
        ref={setVideoEl}
        src="/video/wwc-highlight.mp4"
        loop
        playsInline
        preload="auto"
        muted={false}
        style={{ position: 'fixed', width: 1, height: 1, top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
        aria-hidden="true"
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

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function AudioToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Use the event highlight video as audio source (hidden video element)
    const video = document.createElement('video');
    video.src = '/video/wwc-highlight.mp4';
    video.loop = true;
    video.volume = volume;
    video.preload = 'metadata';
    video.playsInline = true;
    // Hide video — we only want the audio track
    video.style.display = 'none';
    document.body.appendChild(video);

    video.addEventListener('loadedmetadata', () => {
      setHasAudio(true);
    }, { once: true });

    video.addEventListener('error', () => {
      setHasAudio(false);
    }, { once: true });

    audioRef.current = video as unknown as HTMLAudioElement;

    return () => {
      video.pause();
      video.remove();
      audioRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;

    if (playing) {
      // Fade out
      const audio = audioRef.current;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.02) {
          audio.volume = Math.max(0, audio.volume - 0.03);
        } else {
          clearInterval(fadeOut);
          audio.pause();
          audio.volume = volume;
        }
      }, 30);
      setPlaying(false);
    } else {
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        // Fade in
        const audio = audioRef.current!;
        const fadeIn = setInterval(() => {
          if (audio.volume < volume - 0.02) {
            audio.volume = Math.min(volume, audio.volume + 0.02);
          } else {
            audio.volume = volume;
            clearInterval(fadeIn);
          }
        }, 30);
        setPlaying(true);
      }).catch(() => {
        // Autoplay blocked — show tooltip
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
      });
    }
  }, [playing, volume]);

  if (!hasAudio) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3">
      <motion.button
        onClick={toggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 4, duration: 0.6, ease }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`audio-btn ${playing ? 'playing' : ''}`}
        aria-label={playing ? 'Pausar áudio ambiente' : 'Tocar áudio ambiente'}
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
        {playing && (
          <div className="absolute -top-1 -right-1 flex gap-[2px]">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-[var(--accent)] rounded-full"
                animate={{
                  height: ['4px', '10px', '6px', '12px', '4px'],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
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
            {playing ? 'Áudio ambiente' : 'Ativar áudio'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

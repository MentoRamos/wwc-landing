'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Ouvir o artigo com a voz do próprio aparelho (Web Speech API).
 *
 * Grátis, sem arquivo e sem chave: decisão do Kauã em 15/09. O custo é que a
 * voz muda de aparelho para aparelho. Três cuidados que o navegador não toma:
 *
 * - O texto chega em pedaços (`speechChunks`), um por vez. O Chrome corta
 *   fala longa perto dos 15 segundos, sem erro nenhum.
 * - "Pausar" cancela e guarda o pedaço atual, e "Continuar" recomeça dali.
 *   `speechSynthesis.pause()` não funciona no Chrome do Android.
 * - Sem suporte, o botão não aparece. Nada pior que um botão que não faz nada.
 */

type State = 'idle' | 'playing' | 'paused';

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === 'pt-BR' && /natural|premium|enhanced|google/i.test(voice.name)) ??
    voices.find((voice) => voice.lang === 'pt-BR') ??
    voices.find((voice) => voice.lang.startsWith('pt'))
  );
}

const noop = () => () => {};

export function ListenButton({ chunks, className = '' }: { chunks: string[]; className?: string }) {
  // Suporte é propriedade do navegador, não estado da página: lido direto, e
  // falso no servidor, então o botão só aparece depois de hidratar.
  const supported = useSyncExternalStore(noop, () => 'speechSynthesis' in window, () => false);
  const [state, setState] = useState<State>('idle');
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const runRef = useRef(0);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    // A lista de vozes chega depois, em alguns navegadores.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  function speakFrom(start: number) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const run = ++runRef.current;
    const voice = pickVoice();

    const say = (i: number) => {
      if (run !== runRef.current) return;
      if (i >= chunks.length) {
        setState('idle');
        indexRef.current = 0;
        setIndex(0);
        return;
      }
      indexRef.current = i;
      setIndex(i);
      const utterance = new SpeechSynthesisUtterance(chunks[i]);
      utterance.lang = 'pt-BR';
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onend = () => say(i + 1);
      utterance.onerror = (event) => {
        // `interrupted` e `canceled` são o nosso próprio cancel ao pausar.
        if (event.error !== 'interrupted' && event.error !== 'canceled') setState('idle');
      };
      synth.speak(utterance);
    };

    setState('playing');
    say(start);
  }

  function pause() {
    runRef.current += 1;
    window.speechSynthesis.cancel();
    setState('paused');
  }

  function stop() {
    runRef.current += 1;
    window.speechSynthesis.cancel();
    indexRef.current = 0;
    setIndex(0);
    setState('idle');
  }

  if (!supported || chunks.length === 0) return null;

  const progress = Math.round((index / chunks.length) * 100);
  const base =
    'inline-flex min-h-11 items-center gap-2.5 border px-4 text-[11px] uppercase tracking-[0.16em] transition';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {state === 'playing' ? (
        <button
          type="button"
          onClick={pause}
          className={`${base} border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)]`}
        >
          <PauseIcon />
          Pausar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => speakFrom(state === 'paused' ? indexRef.current : 0)}
          className={`${base} border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)]`}
        >
          <PlayIcon />
          {state === 'paused' ? 'Continuar' : 'Ouvir o artigo'}
        </button>
      )}

      {state !== 'idle' && (
        <>
          <button
            type="button"
            onClick={stop}
            className={`${base} border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]`}
          >
            Parar
          </button>
          <span className="meta" aria-live="polite">
            {progress}% lido
          </span>
        </>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

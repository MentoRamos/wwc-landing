'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { audioLength, clock } from '@/lib/core/audio.core';

/**
 * Ouvir o artigo no arquivo que o servidor sintetizou: dois apresentadores
 * conversando sobre o texto, no estilo podcast.
 *
 * Quatro decisões moldam este componente, e todas vêm de como a coisa é
 * ouvida de verdade (no carro, andando, com a tela apagada):
 *
 * 1. `preload="none"`. São ~3,5 MB por episódio. Ninguém paga isso de dados
 *    por ter aberto um artigo para ler. O download começa no play.
 * 2. A duração aparece ANTES de baixar, porque ela vem do banco
 *    (`audio_seconds`). O `<audio>` corrige sozinho quando os metadados
 *    chegam, e aí a barra passa a valer.
 * 3. Velocidade e voltar 15 segundos existem porque este áudio é ouvido no
 *    trânsito, onde se perde um trecho e se quer repetir sem procurar.
 * 4. Se o arquivo não carregar, o botão volta para a voz do aparelho
 *    (`fallback`) em vez de virar um player quebrado. Feia e funcionando é
 *    melhor que bonita e muda.
 */

const RATES: number[] = [1, 1.25, 1.5];

type State = 'idle' | 'playing' | 'paused';

export function ArticleAudio({
  url,
  seconds,
  fallback,
  spotifyUrl,
  className = '',
}: {
  url: string;
  seconds: number | null;
  fallback?: ReactNode;
  /** O canal no Spotify, quando existe. Ausente, o link não aparece. */
  spotifyUrl?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>('idle');
  const [current, setCurrent] = useState(0);
  // Começa pela duração declarada e passa a ser a medida pelo navegador.
  const [duration, setDuration] = useState(seconds ?? 0);
  const [rate, setRate] = useState<number>(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  if (failed) return <>{fallback ?? null}</>;

  function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) {
      // A promessa do play() é recusada quando o arquivo não existe ou o
      // formato não serve. Sem o catch, isso vira "unhandled rejection" no
      // console e nada na tela.
      void audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  }

  function back15() {
    const audio = ref.current;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15);
  }

  function seek(value: number) {
    const audio = ref.current;
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = value;
  }

  const total = duration > 0 ? duration : (seconds ?? 0);
  const length = audioLength(total);
  const base =
    'inline-flex min-h-11 items-center gap-2.5 border px-4 text-[11px] uppercase tracking-[0.16em] transition';
  const accent = `${base} border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)]`;
  const quiet = `${base} border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]`;

  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      <audio
        ref={ref}
        src={url}
        preload="none"
        onPlay={() => setState('playing')}
        onPause={() => setState((previous) => (previous === 'idle' ? 'idle' : 'paused'))}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const measured = event.currentTarget.duration;
          if (Number.isFinite(measured) && measured > 0) setDuration(measured);
          event.currentTarget.playbackRate = rate;
        }}
        onEnded={() => {
          setState('idle');
          setCurrent(0);
        }}
        onError={() => setFailed(true)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggle} className={accent}>
          {state === 'playing' ? <PauseIcon /> : <PlayIcon />}
          {state === 'playing' ? 'Pausar' : state === 'paused' ? 'Continuar' : 'Ouvir o artigo'}
          {state === 'idle' && length ? (
            <span className="text-[var(--text-3)]">· {length}</span>
          ) : null}
        </button>

        {/*
          O mesmo episódio mora no nosso canal de podcast. Quem ouve no carro
          prefere a fila do app a uma aba do navegador, e o link fica ao lado
          do player em vez de substituí-lo: trocar mandaria embora quem só
          queria apertar play na página.
        */}
        {spotifyUrl && state === 'idle' && (
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className={quiet}>
            <SpotifyIcon />
            No Spotify
          </a>
        )}

        {state !== 'idle' && (
          <>
            <button type="button" onClick={back15} className={quiet} aria-label="Voltar 15 segundos">
              <BackIcon />
              15s
            </button>
            <button
              type="button"
              onClick={() => setRate((previous) => RATES[(RATES.indexOf(previous) + 1) % RATES.length])}
              className={quiet}
              aria-label={`Velocidade: ${rate} vez${rate === 1 ? '' : 'es'}`}
            >
              {rate}&times;
            </button>
          </>
        )}
      </div>

      {state !== 'idle' && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(total))}
            step={1}
            value={Math.min(Math.floor(current), Math.max(1, Math.floor(total)))}
            onChange={(event) => seek(Number(event.currentTarget.value))}
            aria-label="Posição no áudio"
            className="h-1 w-full cursor-pointer appearance-none bg-[var(--border)] accent-[var(--accent)]"
          />
          <span className="meta shrink-0 tabular-nums" aria-live="off">
            {clock(current)} / {clock(total)}
          </span>
        </div>
      )}

      {/* Quem não quer ouvir uma conversa de dez minutos leva o arquivo. */}
      {state !== 'idle' && (
        <a
          href={url}
          download
          className="meta w-fit underline decoration-[var(--border)] underline-offset-4 transition hover:text-[var(--text-1)]"
        >
          Baixar o áudio
        </a>
      )}
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.78.78 0 0 1-1.07.26c-2.93-1.79-6.62-2.2-10.97-1.2a.78.78 0 1 1-.35-1.52c4.76-1.09 8.84-.62 12.13 1.39.37.23.49.71.26 1.07zm1.23-2.74a.97.97 0 0 1-1.34.32c-3.35-2.06-8.46-2.66-12.42-1.45a.97.97 0 1 1-.57-1.86c4.52-1.37 10.15-.7 14 1.66a.97.97 0 0 1 .33 1.33zm.11-2.86C14.1 8.46 7.6 8.25 3.76 9.42a1.17 1.17 0 1 1-.68-2.24c4.41-1.34 11.6-1.08 16.17 1.63a1.17 1.17 0 0 1-1.2 2.01z" />
    </svg>
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

function BackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

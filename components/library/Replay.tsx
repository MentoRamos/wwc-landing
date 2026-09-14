'use client';

import { useEffect, useRef, useState } from 'react';
import { saveProgress } from '@/app/(app)/biblioteca/actions';

/**
 * A replay, and the bookkeeping that lets someone come back to it.
 *
 * Worth being honest about what the unlisted video is and is not: the id is
 * visible to any member who opens the devtools, and once it is out there is no
 * revoking it. That was accepted when YouTube was chosen. Rendering it only
 * after the server has checked the session raises the bar from "share a link"
 * to "open the inspector", which is worth the few lines it costs and is not
 * the same thing as protection.
 */
const SAVE_EVERY_MS = 15_000;

type Player = {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: Record<string, unknown>) => Player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Loads the IFrame API once per page, however many players ask for it. */
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    if (!document.getElementById('yt-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.append(script);
    }
  });
}

export function Replay({
  contentItemId,
  youtubeId,
  title,
  startAt,
}: {
  contentItemId: string;
  youtubeId: string;
  title: string;
  startAt: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    loadApi()
      .then(() => {
        if (cancelled || !holder.current || !window.YT) return;

        player.current = new window.YT.Player(holder.current, {
          videoId: youtubeId,
          playerVars: { start: startAt, rel: 0, modestbranding: 1, playsinline: 1 },
        });

        timer = setInterval(() => {
          const current = player.current;
          if (!current?.getCurrentTime) return;

          const at = current.getCurrentTime();
          const total = current.getDuration?.() ?? 0;
          if (!at) return;

          // Within the last 15 seconds it is finished for our purposes;
          // nobody sits through the goodbyes twice.
          void saveProgress(contentItemId, at, total > 0 && at >= total - 15);
        }, SAVE_EVERY_MS);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      player.current?.destroy?.();
      player.current = null;
    };
  }, [contentItemId, youtubeId, startAt]);

  if (failed) {
    return (
      <p role="alert" className="text-sm text-[var(--text-2)]">
        Não consegui carregar o player. Recarregue a página. Se insistir, me chame
        no WhatsApp.
      </p>
    );
  }

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden bg-[var(--bg-card)]">
        <div ref={holder} className="h-full w-full" aria-label={title} />
      </div>
      {startAt > 0 && (
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
          Continuando de onde você parou
        </p>
      )}
    </div>
  );
}

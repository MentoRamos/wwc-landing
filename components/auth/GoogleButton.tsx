'use client';

import { useState } from 'react';
import { browserClient } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * The only way in.
 *
 * Sign-in starts in the browser because that is where the PKCE verifier has to
 * be created; it travels in a cookie, which is how `/auth/callback` can finish
 * on the server a handshake that began here.
 */
export function GoogleButton({ next }: { next: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  async function signIn() {
    setState('sending');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await browserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      // On success the browser is already navigating away; only a failure
      // ever gets back here.
      if (error) throw error;
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={state === 'sending'}
        className="btn-glow flex w-full items-center justify-center gap-3 border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-4 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-card-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        <GoogleMark />
        {state === 'sending' ? 'Abrindo o Google…' : 'Entrar com Google'}
      </button>

      {state === 'error' && (
        <p role="alert" className="text-sm text-[var(--text-2)]">
          Não consegui abrir o Google agora. Tente de novo em alguns segundos — se
          continuar, me chame no WhatsApp.
        </p>
      )}
    </div>
  );
}

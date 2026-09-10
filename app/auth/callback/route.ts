import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/core/auth.core';
import { originOf } from '@/lib/auth/request-origin';
import { serverClient } from '@/lib/supabase/server';

/**
 * Where Google sends someone back.
 *
 * The browser started the handshake and kept the PKCE verifier in a cookie;
 * this trades the one-time code for a session and writes it as cookies the
 * server can read on the next render.
 *
 * Nothing here is trusted from the URL. The code is verified by the auth
 * server, and `?next=` is reduced to a path on this site before it becomes a
 * redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = originOf(request);
  const back = (reason: string) => NextResponse.redirect(new URL(`/entrar?erro=${reason}`, origin));

  // Google or Supabase refused, or the person closed the consent screen.
  if (url.searchParams.get('error')) return back('cancelado');

  const code = url.searchParams.get('code');
  if (!code) return back('sem-codigo');

  const supabase = await serverClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The status and nothing else. The error body from the auth server can
    // carry the address of the person trying to sign in.
    console.error('OAuth code exchange failed. status=%s', error.status ?? 'unknown');
    return back('falhou');
  }

  return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get('next')), origin));
}

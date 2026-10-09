import { NextResponse, type NextRequest } from 'next/server';
import { originOf } from '@/lib/auth/request-origin';
import { serverClient } from '@/lib/supabase/server';

/**
 * Signing out.
 *
 * POST only, and no GET on purpose: a sign-out that answers GET can be fired
 * by an `<img src>` on any page on the internet, and the person is logged out
 * of our site by someone else's. Only a form we render posts here.
 */
export async function POST(request: NextRequest) {
  const supabase = await serverClient();

  // `local` clears this browser's session. Other devices stay signed in, which
  // is what someone closing a laptop expects.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    console.error('Sign-out failed. status=%s', error.status ?? 'unknown');
  }

  // 303, so the browser follows with a GET instead of re-posting.
  return NextResponse.redirect(new URL('/entrar', originOf(request)), 303);
}

'use client';

import { useActionState } from 'react';
import { revokeAccess, type ActionState } from '@/app/admin/acessos/actions';

const EMPTY: ActionState = { ok: false, message: '' };

/**
 * Its own form per row, so revoking one person never carries the state of
 * another, and so this works with JavaScript off.
 */
export function RevokeButton({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState(revokeAccess, EMPTY);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Revogar o acesso de ${email}`}
        className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-50"
      >
        {pending ? 'Revogando…' : 'Revogar'}
      </button>
      {state.message && !state.ok && (
        <span role="alert" className="text-xs text-[var(--text-3)]">
          {state.message}
        </span>
      )}
    </form>
  );
}

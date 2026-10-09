'use client';

import { useActionState, useState } from 'react';
import { revokeAccess, type ActionState } from '@/app/admin/acessos/actions';

const EMPTY: ActionState = { ok: false, message: '' };

/**
 * Its own form per row, so revoking one person never carries the state of
 * another, and so this works with JavaScript off.
 *
 * Revoking asks twice. The rows are one line tall and the button sits at the
 * end of every one of them, which is exactly the shape that produces a
 * mis-tap on a phone — and the mis-tap cuts a paying member off from what
 * they bought. The confirmation is inline rather than a `confirm()` dialog
 * because a native dialog on iOS blocks the page and reads as a browser
 * warning, not as a question this page is asking.
 *
 * Without JavaScript the first press submits, which is the old behaviour:
 * the guard is a convenience, and the Server Action is what actually checks
 * that the person pressing it is an admin.
 */
export function RevokeButton({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState(revokeAccess, EMPTY);
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />

      {armed ? (
        <>
          <span className="text-xs text-[var(--text-2)]">Revogar mesmo?</span>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Confirmar a revogação do acesso de ${email}`}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4 transition hover:text-[var(--text-1)] disabled:opacity-50"
          >
            {pending ? 'Revogando…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            disabled={pending}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] transition hover:text-[var(--text-1)]"
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="submit"
          onClick={(event) => {
            event.preventDefault();
            setArmed(true);
          }}
          disabled={pending}
          aria-label={`Revogar o acesso de ${email}`}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-50"
        >
          Revogar
        </button>
      )}

      {state.message && !state.ok && (
        <span role="alert" className="text-xs text-[var(--text-3)]">
          {state.message}
        </span>
      )}
    </form>
  );
}

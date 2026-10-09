'use client';

import { useActionState, useState } from 'react';
import { removeInterest, type ActionState } from '@/app/admin/interesse/actions';

const EMPTY: ActionState = { ok: false, message: '' };

/**
 * Asks twice, like revoking does, and for the same reason: the rows are one
 * line tall and the control sits at the end of every one of them.
 */
export function RemoveInterestButton({ id, who }: { id: string; who: string }) {
  const [state, action, pending] = useActionState(removeInterest, EMPTY);
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />

      {armed ? (
        <>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Confirmar a remoção de ${who}`}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4 disabled:opacity-50"
          >
            {pending ? 'Removendo…' : 'Confirmar'}
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
          aria-label={`Remover ${who} da lista`}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-4)] transition hover:text-[var(--accent)]"
        >
          Remover
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

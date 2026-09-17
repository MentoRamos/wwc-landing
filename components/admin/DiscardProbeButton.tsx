'use client';

import { useActionState, useState } from 'react';
import { discardProbe } from '@/app/admin/sondas/actions';
import { INITIAL_STATE } from '@/lib/admin/action-state';

/**
 * Pergunta duas vezes, como o resto do admin: o controle fica no fim de uma
 * linha e o que ele apaga é a única cópia do evento que ainda não foi
 * entendido.
 */
export function DiscardProbeButton({ id, when }: { id: string; when: string }) {
  const [state, action, pending] = useActionState(discardProbe, INITIAL_STATE);
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />

      {armed ? (
        <>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Confirmar o descarte da sonda de ${when}`}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4 disabled:opacity-50"
          >
            {pending ? 'Descartando…' : 'Confirmar'}
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
          aria-label={`Descartar a sonda de ${when}`}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-4)] transition hover:text-[var(--accent)]"
        >
          Descartar
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

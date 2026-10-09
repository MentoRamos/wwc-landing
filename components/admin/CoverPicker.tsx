'use client';

import { useActionState } from 'react';
import { setCover, type ActionState } from '@/app/admin/artigos/actions';

const INITIAL: ActionState = { ok: false, message: '' };

/**
 * Trocar a capa de um artigo. A escolha automática acerta o tema, mas não
 * sabe que a taça de vinho saiu em dois artigos seguidos: isso o Kauã vê.
 */
export function CoverPicker({
  id,
  current,
  options,
}: {
  id: string;
  current: string;
  options: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setCover, INITIAL);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`capa-${id}`}>
        Capa
      </label>
      <select
        id={`capa-${id}`}
        name="cover"
        defaultValue={current}
        className="min-h-11 max-w-[14rem] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text-2)]"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 border border-[var(--border)] px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-3)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {pending ? '...' : 'Trocar capa'}
      </button>
      {state.message && (
        <span role={state.ok ? 'status' : 'alert'} className="text-xs text-[var(--text-3)]">
          {state.message}
        </span>
      )}
    </form>
  );
}

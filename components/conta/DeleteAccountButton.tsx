'use client';

import { useActionState, useState } from 'react';
import { deleteAccount } from '@/app/(app)/conta/actions';
import { INITIAL_STATE } from '@/lib/admin/action-state';

/**
 * Apagar a conta em dois passos, e o segundo é escrito à mão.
 *
 * Um botão só, ou dois toques, bastam para apagar o report de um aluno por
 * engano no telefone — e aqui o engano não tem volta: some o acesso, somem os
 * documentos, some a identidade. Escrever APAGAR não é cerimônia, é o único
 * gesto que não acontece sozinho no bolso.
 *
 * A confirmação é embutida e não um `confirm()` do navegador: no iOS o diálogo
 * nativo trava a página e lê como aviso do navegador, não como pergunta que
 * esta tela está fazendo.
 */
export function DeleteAccountButton() {
  const [state, action, pending] = useActionState(deleteAccount, INITIAL_STATE);
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="mt-6 min-h-11 border border-[var(--border)] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
      >
        Apagar minha conta
      </button>
    );
  }

  return (
    <form action={action} className="mt-6 max-w-md border border-[var(--border)] p-6">
      <p className="prose-body">
        Isto apaga a sua conta, os seus acessos e os documentos que estão aqui, agora e sem
        volta. Os registros de compra continuam, porque a lei fiscal exige.
      </p>

      <label
        htmlFor="confirmacao"
        className="mt-6 block text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)]"
      >
        Escreva APAGAR para confirmar
      </label>
      <input
        id="confirmacao"
        name="confirmacao"
        autoComplete="off"
        required
        className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
      />

      <div className="mt-6 flex items-center gap-6">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4 transition hover:text-[var(--text-1)] disabled:opacity-50"
        >
          {pending ? 'Apagando…' : 'Apagar definitivamente'}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] transition hover:text-[var(--text-1)]"
        >
          Cancelar
        </button>
      </div>

      {state.message && !state.ok && (
        <p className="mt-4 text-xs text-[var(--text-2)]">{state.message}</p>
      )}
    </form>
  );
}

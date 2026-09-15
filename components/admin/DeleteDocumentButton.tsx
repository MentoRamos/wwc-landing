'use client';

import { useActionState, useState } from 'react';
import { deleteDocument, INITIAL_STATE } from '@/app/admin/documentos/actions';

/**
 * Pergunta duas vezes, pelo mesmo motivo que o botão de revogar acesso: a
 * linha tem uma altura só e o botão fica no fim dela, que é exatamente a forma
 * que produz toque errado no telefone. Aqui o toque errado apaga o report de
 * um aluno.
 *
 * A confirmação é embutida e não um `confirm()` nativo: no iOS o diálogo do
 * navegador trava a página e lê como aviso do navegador, não como pergunta que
 * esta tela está fazendo.
 */
export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteDocument, INITIAL_STATE);
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />

      {armed ? (
        <>
          <span className="text-xs text-[var(--text-2)]">Apagar mesmo?</span>
          <button
            type="submit"
            disabled={pending}
            aria-label={`Confirmar que o documento "${title}" será apagado`}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4 transition hover:text-[var(--text-1)] disabled:opacity-50"
          >
            {pending ? 'Apagando…' : 'Confirmar'}
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
          aria-label={`Apagar o documento "${title}"`}
          className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-50"
        >
          Apagar
        </button>
      )}

      {state.message && !state.ok && (
        <span className="text-xs text-[var(--text-2)]">{state.message}</span>
      )}
    </form>
  );
}

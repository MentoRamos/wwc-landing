'use client';

import { useActionState } from 'react';
import {
  publishContent,
  unpublishContent,
  INITIAL_STATE,
  type ActionState,
} from '@/app/admin/conteudo/actions';

/**
 * Tirar e pôr de volta na prateleira, uma linha por vez.
 *
 * Cada linha tem o seu próprio form, então despublicar um item nunca carrega
 * o estado de outro — e funciona com JavaScript desligado.
 *
 * Não pede confirmação, ao contrário de revogar acesso: isto é reversível
 * pelo botão ao lado, não custa a ninguém o que pagou, e o progresso de quem
 * já assistiu continua no banco.
 */
export function ShelfToggle({
  id,
  title,
  published,
}: {
  id: string;
  title: string;
  published: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    published ? unpublishContent : publishContent,
    INITIAL_STATE,
  );

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`${published ? 'Despublicar' : 'Publicar'} ${title}`}
        className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-50"
      >
        {pending ? '…' : published ? 'Despublicar' : 'Publicar'}
      </button>

      {state.message && !state.ok && (
        <span role="alert" className="text-xs text-[var(--text-3)]">
          {state.message}
        </span>
      )}
    </form>
  );
}

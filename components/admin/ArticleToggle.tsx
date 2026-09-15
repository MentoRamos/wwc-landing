'use client';

import { useActionState } from 'react';
import { hideArticle, showArticle, type ActionState } from '@/app/admin/artigos/actions';

const INITIAL: ActionState = { ok: false, message: '' };

/**
 * O botão de tirar do ar. Sem confirmação, como o da prateleira: é
 * reversível pelo mesmo botão, e a hora em que ele é usado é a hora em que
 * alguém achou um erro num artigo público, ou seja, a hora de ser rápido.
 */
export function ArticleToggle({
  id,
  title,
  hidden,
}: {
  id: string;
  title: string;
  hidden: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    hidden ? showArticle : hideArticle,
    INITIAL,
  );

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`${hidden ? 'Republicar' : 'Despublicar'} ${title}`}
        className="min-h-11 text-xs uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-50"
      >
        {pending ? '...' : hidden ? 'Republicar' : 'Despublicar'}
      </button>

      {state.message && !state.ok && (
        <span role="alert" className="text-xs text-[var(--text-3)]">
          {state.message}
        </span>
      )}
    </form>
  );
}

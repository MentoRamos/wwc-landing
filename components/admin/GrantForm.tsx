'use client';

import { useActionState } from 'react';
import { grantAccess, type ActionState } from '@/app/admin/acessos/actions';
import { PRODUCTS } from '@/lib/core/admin.core';

const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'Protocol — vitalício',
  circle: 'Circle — assinatura',
  connect: 'Connect — convidado do evento',
  face_a_face: 'Face a Face — sessão avulsa',
};

const TERMS = [
  { value: 'lifetime', label: 'Vitalício' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '365d', label: '1 ano' },
];

const EMPTY: ActionState = { ok: false, message: '' };

const field =
  'w-full border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-1)] ' +
  'outline-none transition focus:border-[var(--accent)]';

/**
 * One box, many addresses. The whole point of this screen is that Kauã can
 * paste what he already has — a column out of a sheet, a list out of
 * WhatsApp — instead of typing four people one at a time.
 */
export function GrantForm() {
  const [state, action, pending] = useActionState(grantAccess, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
          E-mails — um por linha
        </span>
        <textarea
          name="emails"
          rows={5}
          required
          spellCheck={false}
          placeholder={'alguem@exemplo.com\noutra@exemplo.com, circle'}
          className={`${field} font-mono`}
        />
        <span className="text-xs text-[var(--text-4)]">
          Dá para colar direto de uma planilha. Um produto depois da vírgula vale só
          para aquela linha.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
            Produto
          </span>
          <select name="product" defaultValue="circle" className={field}>
            {PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {PRODUCT_LABEL[product]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
            Prazo
          </span>
          <select name="term" defaultValue="lifetime" className={field}>
            {TERMS.map((term) => (
              <option key={term.value} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
          Nota — opcional
        </span>
        <input
          name="note"
          type="text"
          placeholder="cortesia, lote do evento, troca de e-mail…"
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-glow border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-4 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-card-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Concedendo…' : 'Conceder acesso'}
      </button>

      {state.message && (
        <div
          role="status"
          className={`border px-4 py-3 text-sm ${
            state.ok
              ? 'border-[var(--accent)] text-[var(--text-1)]'
              : 'border-[var(--border-hover)] text-[var(--text-2)]'
          }`}
        >
          <p>{state.message}</p>
          {state.details && state.details.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-[var(--text-3)]">
              {state.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

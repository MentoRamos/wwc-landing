'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, INPUT_CLASS, describedBy } from '@/components/ui/Field';
import { grantAccess, type ActionState } from '@/app/admin/acessos/actions';
import { PRODUCTS } from '@/lib/core/admin.core';

/**
 * O parêntese no lugar do travessão não é gosto: travessão em texto visível é
 * proibido pela regra de copy PT-BR que os dois design systems listam em
 * "Forbidden", e estes rótulos apareciam na tela.
 */
const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'Protocol (vitalício)',
  circle: 'Circle (assinatura)',
  connect: 'Connect (convidado do evento)',
  face_a_face: 'Face a Face (sessão avulsa)',
};

const TERMS = [
  { value: 'lifetime', label: 'Vitalício' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '365d', label: '1 ano' },
];

const EMPTY: ActionState = { ok: false, message: '' };

/**
 * One box, many addresses. The whole point of this screen is that Kauã can
 * paste what he already has — a column out of a sheet, a list out of
 * WhatsApp — instead of typing four people one at a time.
 *
 * A forma vem toda de `Field` e `INPUT_CLASS` agora. Antes esta tela tinha a
 * própria constante `field` e o próprio `<label>` à mão, o que a deixava fora
 * do sistema de duas maneiras que dá para ver no print: os campos ficavam num
 * cinza diferente do resto da plataforma, e os rótulos não eram `.eyebrow`.
 * Um admin que parece outro produto é um admin em que se erra mais.
 */
export function GrantForm() {
  const [state, action, pending] = useActionState(grantAccess, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field
        id="emails"
        label="E-mails, um por linha"
        hint="Dá para colar direto de uma planilha. Um produto depois da vírgula vale só para aquela linha."
      >
        <textarea
          id="emails"
          name="emails"
          rows={6}
          required
          spellCheck={false}
          placeholder={'alguem@exemplo.com\noutra@exemplo.com, circle'}
          // `resize-y` porque o punho nativo de redimensionar nos dois eixos
          // deixa esticar o campo para fora da coluna e quebrar o layout.
          className={`${INPUT_CLASS} resize-y font-mono leading-relaxed`}
          {...describedBy('emails', { hint: true })}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="product" label="Produto">
          <select id="product" name="product" defaultValue="circle" className={INPUT_CLASS}>
            {PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {PRODUCT_LABEL[product]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="term" label="Prazo">
          <select id="term" name="term" defaultValue="lifetime" className={INPUT_CLASS}>
            {TERMS.map((term) => (
              <option key={term.value} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="note" label="Nota (opcional)">
        <input
          id="note"
          name="note"
          type="text"
          placeholder="cortesia, lote do evento, troca de e-mail…"
          className={INPUT_CLASS}
        />
      </Field>

      {/*
        A ação principal da tela era o elemento mais fraco dela: um botão com
        fundo `--bg-card` sobre fundo `--bg-card`, sem ouro, esticado a 100% da
        coluna. Botão de 660px lê como faixa, não como gesto. Agora é o
        `primary` do sistema, no tamanho que ele tem em toda a plataforma, e
        `self-start` devolve a ele a largura do próprio texto.
      */}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="self-start">
        {pending ? 'Concedendo…' : 'Conceder acesso'}
      </Button>

      {state.message && (
        <div
          role="status"
          className={`border-l-2 bg-[var(--bg-card)] px-4 py-3 text-sm ${
            state.ok
              ? 'border-[var(--accent)] text-[var(--text-1)]'
              : 'border-[var(--text-4)] text-[var(--text-2)]'
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

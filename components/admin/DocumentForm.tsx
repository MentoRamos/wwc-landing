'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, INPUT_CLASS, describedBy } from '@/components/ui/Field';
import { uploadDocument } from '@/app/admin/documentos/actions';
import { INITIAL_STATE } from '@/lib/admin/action-state';
import { DOC_KINDS, DOC_KIND_LABEL } from '@/lib/core/student.core';

/**
 * Subir um report sem passar por SQL.
 *
 * O e-mail vem antes do arquivo de propósito: é o campo que decide de QUEM é o
 * documento, e é o único erro aqui que entrega dado de saúde de uma pessoa
 * para outra. Vem primeiro, sozinho na linha, e com o aviso embaixo.
 */
export function DocumentForm() {
  const [state, action, pending] = useActionState(uploadDocument, INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field
        id="email"
        label="E-mail do aluno"
        hint="Confira antes de enviar: é este campo que decide quem vai ver o documento."
      >
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="aluno@exemplo.com"
          className={`${INPUT_CLASS} font-mono`}
          {...describedBy('email', { hint: true })}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="kind" label="Tipo">
          <select id="kind" name="kind" defaultValue="weekly_report" className={INPUT_CLASS}>
            {DOC_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {DOC_KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="issued_at"
          label="Data de emissão"
          hint="A data a que o documento se refere, não a de hoje."
        >
          <input
            id="issued_at"
            name="issued_at"
            type="date"
            className={INPUT_CLASS}
            {...describedBy('issued_at', { hint: true })}
          />
        </Field>
      </div>

      <Field id="title" label="Título">
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Weekly Report - Semana 3"
          className={INPUT_CLASS}
        />
      </Field>

      <Field id="period_label" label="Período (opcional)">
        <input
          id="period_label"
          name="period_label"
          type="text"
          placeholder="Semana 3 (08-14 set)"
          className={INPUT_CLASS}
        />
      </Field>

      <Field id="file" label="Arquivo" hint="Só PDF, até 50 MB. O bucket recusa o resto.">
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          className={`${INPUT_CLASS} file:mr-4 file:border-0 file:bg-transparent file:text-[11px] file:uppercase file:tracking-[0.18em] file:text-[var(--accent)]`}
          {...describedBy('file', { hint: true })}
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="self-start">
        {pending ? 'Enviando…' : 'Enviar documento'}
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
          {state.message}
        </div>
      )}
    </form>
  );
}

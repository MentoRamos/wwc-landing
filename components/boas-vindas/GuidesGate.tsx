'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, INPUT_CLASS, describedBy } from '@/components/ui/Field';
import { BOAS_VINDAS_SOURCE, GUIAS } from '@/lib/boas-vindas';

type Status = 'idle' | 'sending' | 'done' | 'error';

/**
 * Name and email, then the six PDFs.
 *
 * The lead goes to the same `/api/interesse` the rest of the site uses, tagged
 * with `BOAS_VINDAS_SOURCE`, so it lands in the `interest` table next to every
 * other raised hand. The gate is a courtesy, not a lock: the files are public
 * PDFs, and a failed post must not keep a member from their gift.
 */
export function GuidesGate() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/interesse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, product: 'circle', source: BOAS_VINDAS_SOURCE }),
      });

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? 'Confira o e-mail e tente de novo.');
        setStatus('error');
        return;
      }
      // Anything else (a 500, a flood limit) is our problem, not theirs.
      setStatus('done');
    } catch {
      setStatus('done');
    }
  }

  if (status === 'done') {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-[var(--text-2)]">
          <strong className="text-[var(--text-1)]">Liberado.</strong> Escolha um guia e faça só esse
          durante os próximos 7 dias.
        </p>
        <ul className="flex flex-col gap-3">
          {GUIAS.map((guia, i) => (
            <li key={guia.arquivo}>
              <a
                href={guia.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-4 border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-1)] transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]"
              >
                <span className="stat-num text-[var(--accent)]">{i + 1}</span>
                <span>{guia.titulo}</span>
                <span className="ml-auto text-xs uppercase tracking-[0.18em] text-[var(--text-3)]">PDF</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field id="bv-nome" label="Nome">
        <input
          id="bv-nome"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={INPUT_CLASS}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <Field id="bv-email" label="E-mail" hint="Para eu te avisar das próximas edições. Sem spam.">
        <input
          id="bv-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className={INPUT_CLASS}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          {...describedBy('bv-email', { hint: true })}
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" disabled={status === 'sending'}>
        {status === 'sending' ? 'Liberando…' : 'Liberar os 6 guias'}
      </Button>

      {status === 'error' && (
        <p role="alert" className="text-sm text-[var(--text-2)]">
          {message}
        </p>
      )}
    </form>
  );
}

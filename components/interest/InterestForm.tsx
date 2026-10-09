'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, INPUT_CLASS, describedBy } from '@/components/ui/Field';
import type { InterestProduct } from '@/lib/core/interest.core';

type Status = 'idle' | 'sending' | 'done' | 'error';

/**
 * The form that exists so a page with nothing to sell still catches the person
 * who wanted to buy.
 *
 * Only the email is required. Every extra required field on a form like this
 * trades leads for tidiness, and the lead is worth more — the phone is asked
 * for because WhatsApp is where Kauã actually closes, but somebody who will
 * not give it still gets through.
 */
export function InterestForm({
  product,
  source,
  cta = 'Me avise quando abrir',
  askWhatsapp = true,
}: {
  product: InterestProduct;
  source: string;
  cta?: string;
  askWhatsapp?: boolean;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/interesse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, product, source }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? 'Não consegui registrar agora.');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setMessage('Não consegui registrar agora. Tente de novo em alguns segundos.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <p
        role="status"
        className="border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-5 text-sm leading-relaxed text-[var(--text-2)]"
      >
        <strong className="text-[var(--text-1)]">Anotado.</strong> Você é avisado por
        e-mail assim que abrir, antes de ir para qualquer outro lugar.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field id="interesse-nome" label="Nome">
        <input
          id="interesse-nome"
          name="name"
          type="text"
          autoComplete="name"
          className={INPUT_CLASS}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <Field id="interesse-email" label="E-mail" hint="É por aqui que eu aviso.">
        <input
          id="interesse-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className={INPUT_CLASS}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          {...describedBy('interesse-email', { hint: true })}
        />
      </Field>

      {askWhatsapp && (
        <Field id="interesse-whatsapp" label="WhatsApp" hint="Opcional.">
          <input
            id="interesse-whatsapp"
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(62) 99999-9999"
            className={INPUT_CLASS}
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            {...describedBy('interesse-whatsapp', { hint: true })}
          />
        </Field>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={status === 'sending'}>
        {status === 'sending' ? 'Registrando…' : cta}
      </Button>

      {status === 'error' && (
        <p role="alert" className="text-sm text-[var(--text-2)]">
          {message}
        </p>
      )}
    </form>
  );
}

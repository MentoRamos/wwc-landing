import type { Metadata } from 'next';
import { GrantForm } from '@/components/admin/GrantForm';
import { RevokeButton } from '@/components/admin/RevokeButton';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'Acessos',
  robots: { index: false, follow: false },
};

const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'Protocol',
  circle: 'Circle',
  connect: 'Connect',
  face_a_face: 'Face a Face',
};

type Row = {
  id: string;
  email_raw: string;
  email_norm: string;
  product: string;
  status: string;
  source: string;
  expires_at: string | null;
  user_id: string | null;
  note: string | null;
  created_at: string;
};

/** What the row is doing right now, in the words Kauã would use. */
function standing(row: Row): { label: string; live: boolean } {
  if (row.status === 'revoked') return { label: 'Revogado', live: false };
  if (row.status === 'canceled') return { label: 'Cancelado', live: false };
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    return { label: `Expirou em ${fmt(row.expires_at)}`, live: false };
  }
  if (row.expires_at) return { label: `Até ${fmt(row.expires_at)}`, live: true };
  return { label: 'Vitalício', live: true };
}

const fmt = (iso: string) => formatDate(iso);

export default async function AcessosPage() {
  await requireAdmin();
  const supabase = await serverClient();

  // Read as the admin, through the same policy everyone else is read through.
  // `entitlements_read_own` already carries `or public.is_admin()`, so there is
  // no service-role client anywhere on this page.
  const { data, error } = await supabase
    .from('entitlements')
    .select(
      'id, email_raw, email_norm, product, status, source, expires_at, user_id, note, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-16">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Acessos</p>
        <h1 className="mt-4 text-4xl">Conceder</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)]">
          O acesso pode ser concedido a quem nunca entrou na plataforma. Ele casa por
          e-mail e já está lá no primeiro login — não existe passo de resgate.
        </p>

        <div className="mt-10">
          <GrantForm />
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Concedidos</h2>

        {error ? (
          <p className="mt-6 text-sm text-[var(--text-2)]">
            Não consegui ler a lista: {error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-2)]">
            Nada ainda. O primeiro acesso concedido aparece aqui.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
            {rows.map((row) => {
              const state = standing(row);
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--text-1)]">{row.email_raw}</p>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {PRODUCT_LABEL[row.product] ?? row.product} · {state.label} ·{' '}
                      {row.source === 'manual' ? 'na mão' : row.source}
                      {row.user_id ? ' · já entrou' : ' · ainda não entrou'}
                    </p>
                    {row.note && (
                      <p className="mt-1 text-xs text-[var(--text-4)]">{row.note}</p>
                    )}
                  </div>

                  {state.live && <RevokeButton id={row.id} email={row.email_raw} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

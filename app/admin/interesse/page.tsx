import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RemoveInterestButton } from '@/components/admin/RemoveInterestButton';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'Interesse',
  robots: { index: false, follow: false },
};

const PRODUCT_LABEL: Record<string, string> = {
  circle: 'Circle',
  connect: 'Connect',
  protocol: 'Protocol',
  face_a_face: 'Face a Face',
};

type Row = {
  id: string;
  email_norm: string;
  product: string;
  name: string | null;
  whatsapp: string | null;
  source: string;
  created_at: string;
};

/**
 * The list of people who said they want something that is not for sale yet.
 *
 * Read through `interest_read_admin`, which is `public.is_admin()` — the same
 * policy everything else on this side goes through, and the reason there is no
 * service-role client on this page even though the route that writes the rows
 * needs one.
 *
 * The WhatsApp number is a link, because the whole point of collecting it is
 * that Kauã closes there and the alternative is copying digits by hand off a
 * phone screen.
 */
export default async function InteressePage() {
  await requireAdmin();
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from('interest')
    .select('id, email_norm, product, name, whatsapp, source, created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  const rows = (data ?? []) as Row[];
  const byProduct = rows.reduce<Record<string, number>>((count, row) => {
    count[row.product] = (count[row.product] ?? 0) + 1;
    return count;
  }, {});

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="Interesse"
        title="Quem levantou a mão"
        lede="Gente que pediu para ser avisada antes de existir link de pagamento. É a primeira fila quando o checkout abrir."
      />

      {Object.keys(byProduct).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(byProduct).map(([product, count]) => (
            <Badge key={product} tone="accent">
              {PRODUCT_LABEL[product] ?? product}: {count}
            </Badge>
          ))}
        </div>
      )}

      {error ? (
        <p className="prose-body">Não consegui ler a lista: {error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Ninguém ainda.">
          Quem preencher o formulário do Circle ou do Connect aparece aqui, do mais
          recente para o mais antigo.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-px overflow-hidden border border-[var(--border)]">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] px-6 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--text-1)]">
                  {row.name || row.email_norm}
                </p>
                {row.name && (
                  <p className="mt-1 truncate text-xs text-[var(--text-3)]">
                    {row.email_norm}
                  </p>
                )}
                <Meta
                  className="mt-1"
                  parts={[
                    PRODUCT_LABEL[row.product] ?? row.product,
                    row.source,
                    formatDate(row.created_at),
                  ]}
                />
              </div>

              <div className="flex shrink-0 items-center gap-5">
                {row.whatsapp && (
                  <a
                    href={`https://wa.me/${row.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)]"
                  >
                    WhatsApp
                  </a>
                )}
                <RemoveInterestButton id={row.id} who={row.name || row.email_norm} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

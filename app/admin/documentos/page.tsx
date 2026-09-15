import type { Metadata } from 'next';
import { DocumentForm } from '@/components/admin/DocumentForm';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime } from '@/lib/core/format.core';
import { DOC_KIND_LABEL, type DocKind } from '@/lib/core/student.core';

export const metadata: Metadata = {
  title: 'Documentos',
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  email_raw: string;
  kind: DocKind;
  title: string;
  period_label: string | null;
  issued_at: string;
  created_at: string;
  user_id: string | null;
};

export default async function DocumentosPage() {
  await requireAdmin();
  const supabase = await serverClient();

  // Lido como admin, pela mesma política que o aluno atravessa:
  // `student_documents_read_own` já carrega `or public.is_admin()`.
  const [{ data, error }, { data: trail }] = await Promise.all([
    supabase
      .from('student_documents')
      .select('id, email_raw, kind, title, period_label, issued_at, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('document_access_log')
      .select('id, actor_role, action, created_at, student_documents(title, email_raw)')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-14 md:gap-20">
      <header>
        <p className="eyebrow">Documentos</p>
        <h1 className="page-title mt-4">Enviar</h1>
        <div className="rule-gold mt-6" aria-hidden="true" />
        <p className="prose-body mt-6">
          Report semanal, plano do ciclo, contrato. Casa por e-mail e já está lá no
          primeiro login do aluno, igual ao acesso: não existe passo de resgate. O
          arquivo nunca fica público, e toda leitura dele vira uma linha na trilha.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <section>
          <DocumentForm />
        </section>

        <section className="flex flex-col gap-12">
          <div>
            <h2 className="section-title">Enviados</h2>
            {error ? (
              <p className="mt-6 text-sm text-[var(--text-2)]">
                Não consegui ler a lista: {error.message}
              </p>
            ) : rows.length === 0 ? (
              <p className="prose-body mt-6">
                Nada ainda. O primeiro documento enviado aparece aqui.
              </p>
            ) : (
              <ul className="mt-6 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
                {rows.map((row) => (
                  <li key={row.id} className="bg-[var(--bg-card)] px-6 py-4">
                    <p className="truncate text-[15px] text-[var(--text-1)]">{row.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {row.email_raw} · {DOC_KIND_LABEL[row.kind] ?? row.kind} ·{' '}
                      {formatDate(row.issued_at)}
                      {row.user_id ? ' · já entrou' : ' · ainda não entrou'}
                    </p>
                    {row.period_label && (
                      <p className="mt-1 text-xs text-[var(--text-4)]">{row.period_label}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
            A trilha aparece na mesma tela de propósito. Ela existe para
            responder "quem abriu o report da Mônica em 14/09", e uma trilha que
            só existe no banco é uma trilha que ninguém olha até a auditoria.
          */}
          <div>
            <h2 className="section-title">Últimas leituras</h2>
            {(trail ?? []).length === 0 ? (
              <p className="prose-body mt-6">Nenhum documento foi aberto ainda.</p>
            ) : (
              <ul className="mt-6 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
                {(trail ?? []).map((entry) => {
                  const doc = Array.isArray(entry.student_documents)
                    ? entry.student_documents[0]
                    : entry.student_documents;

                  return (
                    <li key={entry.id} className="bg-[var(--bg-card)] px-6 py-3">
                      <p className="text-sm text-[var(--text-1)]">
                        {doc?.title ?? 'documento removido'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-3)]">
                        {entry.actor_role === 'own' ? 'o próprio aluno' : 'admin'} ·{' '}
                        {entry.action} · {formatDateTime(entry.created_at)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

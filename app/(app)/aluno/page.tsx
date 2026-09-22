import type { Metadata } from 'next';
import { Band } from '@/components/ui/Band';
import { Card, CardAction, CardGrid } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/core/format.core';
import { groupDocuments, type StudentDocRow } from '@/lib/core/student.core';

export const metadata: Metadata = {
  title: 'Acompanhamento',
  robots: { index: false, follow: false },
};

/**
 * O que é de uma pessoa só.
 *
 * Toda outra tela logada mostra coisa igual para quem comprou o mesmo produto.
 * Esta mostra o report da semana passada, o plano do ciclo e o contrato — de
 * um aluno, e de mais ninguém. Não há checagem de dono nesta página porque não
 * pode haver: `student_documents_read_own` devolve as linhas do próprio e nada
 * mais, então uma consulta que esquecesse o filtro continuaria correta, e uma
 * página nova não tem como esquecer uma verificação que não mora aqui.
 *
 * Nenhum link aponta para o arquivo. O que aparece é o endereço da rota, que
 * confere de novo e só então assina uma URL de cinco minutos — e registra a
 * leitura antes de entregar.
 */
export default async function AlunoPage() {
  await requireUser();
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from('student_documents')
    .select('id, kind, title, period_label, issued_at, created_at, storage_path')
    .order('issued_at', { ascending: false });

  // O que a tela deixa de mostrar tem que aparecer em algum lugar, senão a
  // falha vira silêncio. O código basta para diagnosticar e não carrega nada
  // do aluno.
  if (error) console.error('[aluno] leitura de documentos falhou', { code: error.code });

  const shelves = groupDocuments((data ?? []) as StudentDocRow[]);

  return (
    <div className="flex flex-col gap-14 md:gap-20">
      <div>
        <SectionHeading
          eyebrow="Acompanhamento"
          title={
            <>
              O seu, <em className="accent-word">só seu</em>.
            </>
          }
        />
        <div className="rule-gold mt-7" aria-hidden="true" />
      </div>

      {error ? (
        // A mensagem do Postgres carrega nome de tabela, de coluna e de
        // política. Nada disso ajuda quem está do outro lado, e o aluno ficava
        // sem saída: nem recarregar, nem avisar alguém.
        <EmptyState
          title="Não consegui abrir seus documentos agora."
          action={
            <Button href="/aluno" variant="primary">
              Tentar de novo
            </Button>
          }
        >
          A falha é nossa, e os seus documentos continuam onde estavam. Se
          insistir, me avise pelo WhatsApp que eu olho na hora.
        </EmptyState>
      ) : shelves.length === 0 ? (
        <EmptyState
          title="Ainda não há nenhum documento seu aqui."
          action={
            <Button href="/inicio" variant="quiet">
              Voltar ao início
            </Button>
          }
        >
          Os reports semanais, o plano do ciclo e o contrato do arco aparecem nesta
          página conforme saem. Se você já recebeu algum por WhatsApp e ele não está
          aqui, me avise.
        </EmptyState>
      ) : (
        shelves.map((shelf) => (
          <Band
            key={shelf.kind}
            eyebrow={shelf.label}
            title={TITLES[shelf.kind]}
            lede={LEDES[shelf.kind]}
          >
            <CardGrid columns={2}>
              {shelf.items.map((item) => (
                <li key={item.id}>
                  <Card href={`/api/aluno/${item.id}/download`}>
                    <p className="card-title">{item.title}</p>
                    <Meta
                      className="mt-3"
                      parts={[item.period_label, `Emitido em ${formatDate(item.issued_at)}`]}
                    />
                    <CardAction>Abrir o PDF</CardAction>
                  </Card>
                </li>
              ))}
            </CardGrid>
          </Band>
        ))
      )}
    </div>
  );
}

const TITLES: Record<string, string> = {
  cycle_plan: 'Para onde estamos indo.',
  weekly_report: 'O que a semana mostrou.',
  material: 'O que apoia o caminho.',
  contract: 'O que foi combinado.',
};

const LEDES: Record<string, string> = {
  cycle_plan: 'O plano do ciclo e o roadmap, do jeito que foram escritos quando o arco começou.',
  weekly_report: 'Um por semana, com o que os números disseram e o que muda por causa disso.',
  material: 'Cardápios, protocolos e o que mais apareceu no meio do acompanhamento.',
  contract: 'O contrato do arco. Fica aqui para você não precisar procurar no e-mail.',
};

import { randomUUID } from 'node:crypto';
import { normEmail } from './admin.core';
import { civilDateISO } from './format.core';

/**
 * A área do aluno, decidida sem banco e sem rede.
 *
 * O que muda de natureza aqui em relação ao resto da plataforma: um report
 * semanal é dado de saúde de uma pessoa só. Duas decisões deste arquivo saem
 * disso e não de gosto — o caminho no bucket não carrega nada que identifique
 * ninguém, e a data de emissão é conferida pelo calendário de São Paulo.
 */
export const DOC_KINDS = ['weekly_report', 'cycle_plan', 'contract', 'material'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  cycle_plan: 'Plano do ciclo',
  weekly_report: 'Reports semanais',
  material: 'Materiais',
  contract: 'Contrato',
};

/**
 * A ordem da página, e ela diz uma coisa: o plano vem antes dos reports porque
 * é o que explica para onde se está indo, e o contrato vai por último porque é
 * o que só se procura quando se procura.
 */
const SHELF_ORDER: readonly DocKind[] = ['cycle_plan', 'weekly_report', 'material', 'contract'];

export type StudentDocRow = {
  id: string;
  kind: DocKind;
  title: string;
  period_label: string | null;
  issued_at: string;
  created_at: string;
  storage_path: string;
};

export type Shelf = { kind: DocKind; label: string; items: StudentDocRow[] };

export function groupDocuments(rows: readonly StudentDocRow[]): Shelf[] {
  return SHELF_ORDER.flatMap((kind) => {
    const items = rows
      .filter((row) => row.kind === kind)
      // Mais recente primeiro. O desempate por criação existe porque dois
      // documentos da mesma data acontecem — uma versão corrigida subida no
      // mesmo dia — e sem critério estável a lista troca de ordem entre um
      // render e outro, com os itens dançando na frente do aluno.
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at) || b.created_at.localeCompare(a.created_at));

    return items.length > 0 ? [{ kind, label: DOC_KIND_LABEL[kind], items }] : [];
  });
}

/**
 * O caminho do arquivo no bucket.
 *
 * Nada aqui identifica ninguém: nem e-mail, nem nome, nem o título que o Kauã
 * digitou. O caminho vaza — para log de erro, para a interface do Storage, para
 * qualquer lugar que registre uma falha de assinatura — e um caminho como
 * `reports/monica@.../semana-3.pdf` transformaria a trilha de auditoria numa
 * fonte de dado pessoal. Quem é o dono está na linha da tabela, atrás do RLS.
 *
 * Tipo e data dão o suficiente para olhar o bucket e entender o volume sem
 * identificar um aluno.
 */
export function storagePathFor(kind: DocKind, issuedAt: string, token: string): string {
  return `${kind}/${issuedAt}/${token}.pdf`;
}

export type UploadInput = {
  email?: string;
  kind?: string;
  title?: string;
  period_label?: string;
  issued_at?: string;
  filename?: string;
};

export type UploadDoc = {
  email_norm: string;
  email_raw: string;
  kind: DocKind;
  title: string;
  period_label: string | null;
  issued_at: string;
  storage_path: string;
};

export type UploadResult = { ok: true; doc: UploadDoc } | { ok: false; message: string };

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isKind = (value: string): value is DocKind =>
  (DOC_KINDS as readonly string[]).includes(value);

export function readUploadForm(input: UploadInput, now: Date): UploadResult {
  const emailRaw = (input.email ?? '').trim();
  if (!LOOKS_LIKE_EMAIL.test(emailRaw)) {
    return { ok: false, message: 'Escreva o e-mail do aluno.' };
  }

  const kind = (input.kind ?? '').trim();
  if (!isKind(kind)) return { ok: false, message: 'Escolha o tipo do documento.' };

  const title = (input.title ?? '').trim();
  if (!title) return { ok: false, message: 'O documento precisa de um título.' };

  // O bucket só aceita `application/pdf`. Recusar aqui evita escrever a linha
  // e só então descobrir, no Storage, que o arquivo não entra — o que deixaria
  // um documento fantasma na lista do aluno.
  const filename = (input.filename ?? '').trim();
  if (!/\.pdf$/i.test(filename)) {
    return { ok: false, message: 'Só entra PDF: o bucket recusa qualquer outro tipo.' };
  }

  const today = civilDateISO(now);
  const issuedAt = (input.issued_at ?? '').trim() || today;
  if (!ISO_DATE.test(issuedAt)) {
    return { ok: false, message: 'A data de emissão precisa estar no formato 2026-09-14.' };
  }

  // Comparação de texto porque ISO ordena como data. O "hoje" vem do calendário
  // de São Paulo: às 21h daqui já é o dia seguinte em UTC, e um report emitido
  // hoje seria recusado como futuro.
  if (issuedAt > today) {
    return { ok: false, message: 'Essa data está no futuro. Um report de amanhã é erro de digitação.' };
  }

  return {
    ok: true,
    doc: {
      email_norm: normEmail(emailRaw),
      email_raw: emailRaw,
      kind,
      title,
      period_label: (input.period_label ?? '').trim() || null,
      issued_at: issuedAt,
      // Token próprio por upload: o mesmo report subido duas vezes são dois
      // arquivos, e a constraint `unique (storage_path)` nunca esbarra num
      // caminho já usado por engano.
      storage_path: storagePathFor(kind, issuedAt, randomUUID()),
    },
  };
}

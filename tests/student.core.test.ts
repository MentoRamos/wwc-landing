import { describe, expect, it } from 'vitest';
import {
  DOC_KINDS,
  DOC_KIND_LABEL,
  groupDocuments,
  readUploadForm,
  storagePathFor,
  type StudentDocRow,
} from '@/lib/core/student.core';

const doc = (over: Partial<StudentDocRow>): StudentDocRow => ({
  id: 'id-1',
  kind: 'weekly_report',
  title: 'Semana 3',
  period_label: null,
  issued_at: '2026-09-07',
  created_at: '2026-09-07T12:00:00Z',
  storage_path: 'weekly_report/2026-09-07/abc.pdf',
  ...over,
});

describe('as prateleiras da área do aluno', () => {
  it('põe o plano do ciclo antes dos reports e o contrato por último', () => {
    const shelves = groupDocuments([
      doc({ id: 'c', kind: 'contract' }),
      doc({ id: 'w', kind: 'weekly_report' }),
      doc({ id: 'p', kind: 'cycle_plan' }),
      doc({ id: 'm', kind: 'material' }),
    ]);

    expect(shelves.map((shelf) => shelf.kind)).toEqual([
      'cycle_plan',
      'weekly_report',
      'material',
      'contract',
    ]);
  });

  it('não inventa prateleira vazia', () => {
    const shelves = groupDocuments([doc({ kind: 'weekly_report' })]);
    expect(shelves).toHaveLength(1);
  });

  it('mostra o mais recente primeiro', () => {
    const shelves = groupDocuments([
      doc({ id: 'velho', issued_at: '2026-08-31' }),
      doc({ id: 'novo', issued_at: '2026-09-14' }),
      doc({ id: 'meio', issued_at: '2026-09-07' }),
    ]);

    expect(shelves[0].items.map((item) => item.id)).toEqual(['novo', 'meio', 'velho']);
  });

  /**
   * Dois reports da mesma data existem de verdade: dois alunos, ou uma versão
   * corrigida subida no mesmo dia. Sem critério de desempate a lista troca de
   * ordem entre um render e outro, e o aluno vê os itens dançando.
   */
  it('desempata data igual por criação, não pelo acaso', () => {
    const shelves = groupDocuments([
      doc({ id: 'b', issued_at: '2026-09-07', created_at: '2026-09-07T10:00:00Z' }),
      doc({ id: 'a', issued_at: '2026-09-07', created_at: '2026-09-07T18:00:00Z' }),
    ]);

    expect(shelves[0].items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('tem rótulo em português para todo tipo que o banco aceita', () => {
    for (const kind of DOC_KINDS) {
      expect(DOC_KIND_LABEL[kind]).toBeTruthy();
    }
  });
});

describe('o caminho do arquivo no bucket', () => {
  /**
   * O caminho vaza para log de erro e para a interface do Storage. Um caminho
   * com o e-mail ou o título dentro transforma a trilha de auditoria numa
   * fonte de dado pessoal — e o report de um aluno é dado de saúde.
   */
  it('não carrega e-mail nem título dentro', () => {
    const path = storagePathFor('weekly_report', '2026-09-07', 'token123');
    expect(path).not.toMatch(/@/);
    expect(path).toBe('weekly_report/2026-09-07/token123.pdf');
  });

  it('separa por tipo e data, que é o que dá para olhar sem identificar ninguém', () => {
    expect(storagePathFor('contract', '2026-01-31', 'zzz')).toBe('contract/2026-01-31/zzz.pdf');
  });
});

describe('o formulário de upload', () => {
  const base = {
    email: 'Aluno@Exemplo.com ',
    kind: 'weekly_report',
    title: 'Semana 3',
    period_label: 'Semana 3 (08-14 set)',
    issued_at: '2026-09-14',
    filename: 'report.pdf',
  };
  const now = new Date('2026-09-14T12:00:00Z');

  it('normaliza o e-mail como o banco normaliza', () => {
    const result = readUploadForm(base, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.email_norm).toBe('aluno@exemplo.com');
    expect(result.doc.email_raw).toBe('Aluno@Exemplo.com');
  });

  it('recusa e-mail que não parece e-mail', () => {
    const result = readUploadForm({ ...base, email: 'Mônica' }, now);
    expect(result.ok).toBe(false);
  });

  it('recusa tipo que o enum do banco não conhece', () => {
    const result = readUploadForm({ ...base, kind: 'relatorio' }, now);
    expect(result.ok).toBe(false);
  });

  it('recusa título vazio', () => {
    const result = readUploadForm({ ...base, title: '   ' }, now);
    expect(result.ok).toBe(false);
  });

  /**
   * O bucket só aceita `application/pdf`. Deixar passar um .docx aqui produz
   * um erro do Storage lá na frente, depois de a linha já ter sido escrita.
   */
  it('recusa arquivo que não é PDF', () => {
    const result = readUploadForm({ ...base, filename: 'report.docx' }, now);
    expect(result.ok).toBe(false);
  });

  it('aceita PDF com maiúscula na extensão', () => {
    expect(readUploadForm({ ...base, filename: 'Report.PDF' }, now).ok).toBe(true);
  });

  /**
   * Um report datado de amanhã é erro de digitação, e ele desalinha a ordem da
   * prateleira do aluno para sempre — fica eternamente no topo.
   */
  it('recusa data no futuro', () => {
    const result = readUploadForm({ ...base, issued_at: '2026-09-15' }, now);
    expect(result.ok).toBe(false);
  });

  it('aceita hoje pelo calendário de São Paulo, não pelo UTC', () => {
    // 14/09 21:00 em São Paulo é 15/09 00:00 em UTC. Um report emitido hoje
    // seria recusado como "futuro" se a conta fosse feita em UTC.
    const lateNight = new Date('2026-09-15T00:30:00Z');
    expect(readUploadForm({ ...base, issued_at: '2026-09-14' }, lateNight).ok).toBe(true);
  });

  it('usa hoje quando a data não vem', () => {
    const result = readUploadForm({ ...base, issued_at: '' }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.issued_at).toBe('2026-09-14');
  });

  it('deixa o período vazio virar nulo, não string vazia', () => {
    const result = readUploadForm({ ...base, period_label: '  ' }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.period_label).toBeNull();
  });

  it('dá a cada upload um caminho próprio, mesmo com tudo igual', () => {
    const a = readUploadForm(base, now);
    const b = readUploadForm(base, now);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.doc.storage_path).not.toBe(b.doc.storage_path);
  });
});

import { describe, expect, it } from 'vitest';
import { CONSENT_TEXT, CONSENT_VERSION, QUESTIONS, readSurveyForm } from '@/lib/evento/survey';

/**
 * A pesquisa de qualificação (8 perguntas + consentimento), no texto de
 * `Evento - Pós-compra do Ingresso`, seção 3. O zod é a única porta: o que
 * não está na lista de opções não entra no banco.
 */
function form(over: Record<string, string | string[] | null> = {}): FormData {
  const base: Record<string, string | string[]> = {
    aparelho: ['whoop', 'apple_watch'],
    tempo_uso: '6m_2a',
    acorda_util: '6h15',
    acorda_sabado: '8h',
    atividade: 'socio_ceo',
    renda: '50k_100k',
    destravar: ['energia', 'sono_regular'],
    quem_le: 'ninguem',
    investimento: '1500_3000',
    consentimento: 'on',
    origem: 't0',
  };
  const merged = { ...base, ...over };
  const data = new FormData();
  for (const [key, value] of Object.entries(merged)) {
    if (value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

describe('a pesquisa', () => {
  it('tem as 8 perguntas do texto-base', () => {
    expect(QUESTIONS).toHaveLength(8);
    expect(QUESTIONS[0].label).toBe('Qual aparelho você usa hoje?');
    expect(QUESTIONS[7].label).toContain('quanto você investiria por mês nisso?');
  });

  it('aceita uma resposta completa e devolve as chaves que vão para o banco', () => {
    const result = readSurveyForm(form());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.answers).toEqual({
      aparelho: ['whoop', 'apple_watch'],
      tempo_uso: '6m_2a',
      acorda_util: '6h15',
      acorda_sabado: '8h',
      atividade: 'socio_ceo',
      renda: '50k_100k',
      destravar: ['energia', 'sono_regular'],
      quem_le: 'ninguem',
      investimento: '1500_3000',
    });
    expect(result.value.origin).toBe('t0');
  });

  it('recusa opção fora da lista', () => {
    expect(readSurveyForm(form({ renda: 'um-milhao' })).ok).toBe(false);
    expect(readSurveyForm(form({ aparelho: ['whoop', 'fitbit'] })).ok).toBe(false);
  });

  it('recusa sem o consentimento', () => {
    expect(readSurveyForm(form({ consentimento: null })).ok).toBe(false);
  });

  it('aceita no máximo duas coisas para destravar', () => {
    expect(readSurveyForm(form({ destravar: ['energia', 'treino', 'longevidade'] })).ok).toBe(false);
    expect(readSurveyForm(form({ destravar: [] })).ok).toBe(false);
  });

  it('dispensa o tempo de uso de quem ainda não usa aparelho', () => {
    expect(readSurveyForm(form({ aparelho: ['nenhum'], tempo_uso: null })).ok).toBe(true);
    expect(readSurveyForm(form({ tempo_uso: null })).ok).toBe(false);
  });

  it('corta texto livre longo e recusa horário vazio', () => {
    expect(readSurveyForm(form({ acorda_util: 'x'.repeat(200) })).ok).toBe(false);
    expect(readSurveyForm(form({ acorda_sabado: '   ' })).ok).toBe(false);
  });

  it('origem desconhecida vira e-mail, e o e-mail vem normalizado quando vem', () => {
    const result = readSurveyForm(form({ origem: 'hacker', email: '  Maria@Exemplo.COM ' }));
    expect(result.ok && result.value.origin).toBe('email');
    expect(result.ok && result.value.email).toBe('maria@exemplo.com');
    expect(readSurveyForm(form({ email: 'nao-e-email' })).ok).toBe(false);
  });

  it('versiona o texto do consentimento', () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(CONSENT_TEXT).toContain('Autorizo o Kauã Ramos a usar estas respostas');
  });
});

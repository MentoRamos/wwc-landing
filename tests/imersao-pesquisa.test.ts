import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask } from './helpers/source';

/**
 * `/imersao/pesquisa`, lida como texto como as outras páginas da imersão.
 * O caminho do banco (gravar, liberar a Ficha) é provado com Postgres em
 * `tests/evento-db.test.ts`; aqui ficam as regras que o código mostra.
 */
const PAGE = join(process.cwd(), 'app/imersao/pesquisa/page.tsx');
const ACTION = join(process.cwd(), 'app/imersao/pesquisa/actions.ts');
const FORM = join(process.cwd(), 'components/imersao/SurveyForm.tsx');
const SURVEY = join(process.cwd(), 'lib/evento/survey.ts');

function code(path: string): string {
  const source = readFileSync(path, 'utf8');
  const mask = commentMask(source);
  return [...source].map((char, i) => (mask[i] ? ' ' : char)).join('');
}

/** Só o que vira texto na tela: strings e JSX, sem comentários. */
const visible = () => [PAGE, FORM, SURVEY].map(code).join('\n');

describe('/imersao/pesquisa', () => {
  it('existe, com a página, a ação e o formulário', () => {
    for (const path of [PAGE, ACTION, FORM, SURVEY]) expect(existsSync(path), path).toBe(true);
  });

  it('nunca é indexada', () => {
    expect(readFileSync(PAGE, 'utf8')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it('confere o token assinado e, sem ele, pede o e-mail', () => {
    const page = code(PAGE);
    expect(page).toContain('verifyLinkToken(');
    expect(code(ACTION)).toContain('verifyLinkToken(');
    expect(code(FORM)).toMatch(/type="email"/);
  });

  it('valida com zod antes de gravar, e grava pela chave (edição, e-mail)', () => {
    const action = code(ACTION);
    expect(action.indexOf('readSurveyForm(')).toBeGreaterThan(-1);
    expect(action.indexOf('readSurveyForm(')).toBeLessThan(action.indexOf(".from('survey_responses')"));
    expect(action).toMatch(/onConflict: 'edition_id,email_norm'/);
  });

  it('libera a Ficha por URL assinada de 10 minutos no bucket privado, só depois de gravar', () => {
    const action = code(ACTION);
    expect(action).toMatch(/storage\s*\.from\('evento'\)\s*\.createSignedUrl\(FICHA_PATH, 600/);
    expect(action).toContain("'ficha-hora-fixa.pdf'");
    expect(action.indexOf('createSignedUrl(')).toBeGreaterThan(action.indexOf(".from('survey_responses')"));
  });

  it('não loga e-mail, nome nem resposta', () => {
    for (const call of code(ACTION).match(/console\.\w+\([^;]*\);/g) ?? []) {
      const args = call.replace(/'[^']*'/g, "''");
      expect(args).not.toMatch(/\b(email|answers|parsed|formData|value)\b/);
    }
  });

  it('segue a Light Copy: sem travessão, sem exclamação, sem as muletas proibidas', () => {
    const text = visible();
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/[A-Za-zÀ-ú]!/);
    expect(text).not.toMatch(/mesmo que|sem precisar/i);
    expect(text).not.toMatch(/Não é [^.]+\. É /);
  });

  it('usa o visual das páginas da imersão (tokens e botão dourado)', () => {
    const text = code(PAGE) + code(FORM);
    expect(text).toContain('container-lp');
    expect(text).toContain('bg-[#C9A84C]');
  });
});

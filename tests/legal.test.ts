import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL, PROCESSORS, isDraft, pending } from '@/lib/legal';

/**
 * The privacy policy is the one page whose value is being true, so what it
 * claims is tested like any other behaviour.
 */
describe('quem responde pelos dados', () => {
  it('segura a publicação enquanto faltar o controlador ou o contato', () => {
    expect(isDraft({ controller: '', contactEmail: 'a@b.com' })).toBe(true);
    expect(isDraft({ controller: 'Fulano', contactEmail: '' })).toBe(true);
    expect(isDraft({ controller: 'Fulano', contactEmail: 'a@b.com' })).toBe(false);
  });

  /**
   * O CPF é opcional de propósito. A LGPD exige identificar o controlador e dar
   * um canal de contato (art. 9º, I e III); não exige número de documento. Um
   * CPF numa página pública é matéria-prima de fraude — quem quiser pode
   * preencher, mas a falta dele não pode travar a publicação.
   */
  it('não exige documento para publicar', () => {
    expect(isDraft({ controller: 'Fulano', contactEmail: 'a@b.com', taxId: '' })).toBe(false);
  });

  it('não deixa um campo vazio virar texto em branco na página', () => {
    expect(pending('', 'e-mail')).toContain('falta preencher');
    expect(pending('contato@exemplo.com', 'e-mail')).toBe('contato@exemplo.com');
  });

  it('está publicável', () => {
    expect(isDraft(LEGAL)).toBe(false);
  });
});

/**
 * A guarda que importa. A lista de quem recebe dado não é escrita à mão e
 * conferida de olho: ela é derivada do que o repositório de fato integra. Um
 * `lib/resend/` novo reprova aqui até a política dizer que a Resend existe —
 * que é exatamente o erro que ninguém percebe, porque uma política incompleta
 * renderiza tão bonito quanto uma completa.
 */
describe('com quem os dados são compartilhados', () => {
  const INTEGRATION_DIRS: Record<string, string> = {
    supabase: 'supabase',
    kiwify: 'kiwify',
    auth: 'google',
  };

  it('nomeia todo serviço externo que o código integra', () => {
    const documented = new Set(PROCESSORS.map((p) => p.id));

    const integrated = readdirSync(join(process.cwd(), 'lib'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => INTEGRATION_DIRS[entry.name])
      .filter((id): id is string => Boolean(id));

    expect(integrated.length).toBeGreaterThan(0);
    expect(integrated.filter((id) => !documented.has(id))).toEqual([]);
  });

  it('descreve cada um sem deixar buraco', () => {
    for (const processor of PROCESSORS) {
      expect(processor.name.length).toBeGreaterThan(0);
      expect(processor.gets.length).toBeGreaterThan(0);
    }
  });
});

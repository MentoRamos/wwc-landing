import { describe, expect, it } from 'vitest';
import { renderT0Email } from '@/lib/core/evento-emails.core';
import { hasPlaceholder } from '@/lib/core/evento.core';

/**
 * A confirmação por e-mail (T0), no texto de `Evento - Pós-compra do
 * Ingresso`, seção 2. É o único e-mail do evento no Marco 1; o resto da
 * contagem entra com os templates da tarefa 5.
 */
const SURVEY = 'https://kauaramos.com/imersao/pesquisa?t=11111111-2222-3333-4444-555555555555.abc';
const GRUPO = 'https://chat.whatsapp.com/I838Hk7bi460qBLRTINvYX';

const render = (over: Partial<Parameters<typeof renderT0Email>[0]> = {}) =>
  renderT0Email({ firstName: 'Maria', surveyUrl: SURVEY, groupUrl: GRUPO, variant: 'padrao', ...over });

describe('o e-mail T0', () => {
  it('confirma o ingresso, chama pelo nome e diz as datas', () => {
    const { subject, html } = render();
    expect(subject).toContain('confirmado');
    expect(html).toContain('Maria, aqui é o Kauã Ramos.');
    expect(html).toContain('quarta 28/10 e quinta 29/10, das 19h30 às 21h30');
    expect(html).toContain('22h15');
  });

  it('leva o link pessoal da pesquisa e o grupo', () => {
    const { html } = render();
    expect(html).toContain(`href="${SURVEY.replace(/&/g, '&amp;')}"`);
    expect(html).toContain(GRUPO);
    expect(html).toContain('Ficha da Hora Fixa');
  });

  it('sem nome, começa sem nome', () => {
    expect(render({ firstName: null }).html).toContain('>Aqui é o Kauã Ramos.');
  });

  it('escapa o nome, que vem da Kiwify e é digitado por quem comprou', () => {
    const { html } = render({ firstName: '<script>x</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('ganha a linha da tarefa só na variação de 21/10 a 27/10', () => {
    expect(render().html).not.toContain('tarefa de 7 dias');
    expect(render({ variant: 'tarefa' }).html).toContain('A turma já começou uma tarefa de 7 dias');
  });

  it('não sai com marcador sobrando', () => {
    const { subject, html } = render();
    expect(hasPlaceholder(subject)).toBe(false);
    expect(hasPlaceholder(html.replace(/<[^>]+>/g, ' '))).toBe(false);
  });

  it('segue a Light Copy: sem travessão, sem exclamação, sem as muletas proibidas', () => {
    for (const variant of ['padrao', 'tarefa'] as const) {
      const { subject, html } = render({ variant });
      const text = `${subject} ${html.replace(/<[^>]+>/g, ' ')}`;
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toContain('!');
      expect(text).not.toMatch(/mesmo que|sem precisar/i);
      expect(text).not.toMatch(/Não é [^.]+\. É /);
    }
  });
});

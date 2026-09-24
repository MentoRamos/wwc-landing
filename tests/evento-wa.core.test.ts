import { describe, expect, it } from 'vitest';
import {
  RECORDING_CHECKOUT_URL,
  WA_STEPS,
  readWaDailyCap,
  renderWaText,
  waAddressVariants,
  waClaimableSteps,
  waPhoneDigits,
  waReason,
} from '@/lib/core/evento-wa.core';
import { hasPlaceholder } from '@/lib/core/evento.core';

/**
 * As mensagens individuais de WhatsApp do pós-compra e as regras de quem
 * pode receber o quê, sem rede. Textos de `Evento - Pós-compra do Ingresso
 * (mensagens, v1, 24 set 2026).md`, seção 2.
 */
const links = {
  surveyUrl: 'https://kauaramos.com/imersao/pesquisa?t=abc.def',
  groupUrl: 'https://chat.whatsapp.com/I838Hk7bi460qBLRTINvYX',
  videosUrl: 'https://youtube.com/playlist?list=teste',
};
const base = { firstName: 'Maria', variant: 'padrao' as const, ...links };

describe('os textos do WhatsApp', () => {
  it('T0 confirma, manda a pesquisa e oferece o SAIR', () => {
    const text = renderWaText('t0', base)!;
    expect(text.startsWith('Maria, aqui é o Kauã Ramos. O seu ingresso da Imersão Performance e Longevidade está confirmado.')).toBe(true);
    expect(text).toContain('quarta 28/10 e quinta 29/10, das 19h30 às 21h30');
    expect(text).toContain(`A Ficha abre pra download no final: ${links.surveyUrl}`);
    expect(text).toContain('Nos vemos no dia 28.');
    expect(text.trim().endsWith('(Se não quiser receber mensagens da imersão por aqui, responde SAIR.)')).toBe(true);
    expect(text).not.toContain('tarefa de 7 dias');
  });

  it('sem nome, a T0 abre sem vírgula solta', () => {
    const text = renderWaText('t0', { ...base, firstName: null })!;
    expect(text.startsWith('Aqui é o Kauã Ramos. O seu ingresso')).toBe(true);
  });

  it('compra entre 21/10 e 27/10 ganha a linha da tarefa antes de "Nos vemos"', () => {
    const text = renderWaText('t0', { ...base, variant: 'tarefa' })!;
    const task = text.indexOf('A turma já começou uma tarefa de 7 dias');
    expect(task).toBeGreaterThan(-1);
    expect(task).toBeLessThan(text.indexOf('Nos vemos no dia 28.'));
  });

  it('compra depois que a sala abriu: evento começou, replay e grupo, sem "Nos vemos no dia 28"', () => {
    const text = renderWaText('t0', { ...base, variant: 'iniciado' })!;
    expect(text).toContain('A imersão já começou.');
    expect(text).toContain('01/11');
    expect(text).toContain(links.groupUrl);
    expect(text).not.toContain('Nos vemos no dia 28');
    expect(text).toContain('responde SAIR');
  });

  it('compradores antigos: primeira linha própria e o resto da T0', () => {
    const text = renderWaText('t0_antigos', base)!;
    expect(
      text.startsWith(
        'Maria, aqui é o Kauã Ramos. Você garantiu o seu ingresso da imersão, e eu separei um presente pra quem já está dentro.',
      ),
    ).toBe(true);
    expect(text).toContain('Anota na agenda:');
    expect(text).toContain(links.surveyUrl);
    expect(text).toContain('responde SAIR');
  });

  it('a oferta da gravação leva o checkout de R$ 67', () => {
    const text = renderWaText('gravacao_oferta', base)!;
    expect(text).toContain('Custa R$ 67.');
    expect(text).toContain(RECORDING_CHECKOUT_URL);
    expect(RECORDING_CHECKOUT_URL).toBe('https://pay.kiwify.com.br/6sOFaf6');
  });

  it('quem comprou antes do corte recebe a gravação incluída, sem preço nem checkout', () => {
    const text = renderWaText('gravacao_incluida', base)!;
    expect(text.startsWith('Maria, mais uma coisa.')).toBe(true);
    expect(text).toContain('continua incluída no seu ingresso, sem nenhum custo a mais');
    expect(text).not.toContain('R$');
    expect(text).not.toContain('kiwify.com.br/6sOFaf6');
    expect(renderWaText('gravacao_incluida', { ...base, firstName: null })!.startsWith('Mais uma coisa.')).toBe(true);
  });

  it('o convite do grupo leva o link do grupo', () => {
    const text = renderWaText('grupo_convite', base)!;
    expect(text.startsWith('Maria, a imersão acontece na quarta 28/10')).toBe(true);
    expect(text).toContain(links.groupUrl);
    expect(renderWaText('grupo_convite', { ...base, firstName: null })!.startsWith('A imersão acontece')).toBe(true);
  });

  it('os vídeos levam o link configurado, e sem link não há texto', () => {
    expect(renderWaText('videos', base)).toContain(links.videosUrl);
    expect(renderWaText('videos', { ...base, videosUrl: undefined })).toBeNull();
  });

  it('sem link da pesquisa não há T0', () => {
    expect(renderWaText('t0', { ...base, surveyUrl: undefined })).toBeNull();
    expect(renderWaText('t0_antigos', { ...base, surveyUrl: undefined })).toBeNull();
  });

  it('passo desconhecido não vira texto', () => {
    expect(renderWaText('faltam7', base)).toBeNull();
  });

  it('nenhum modelo tem marcador sobrando, travessão ou exclamação', () => {
    for (const step of WA_STEPS) {
      for (const variant of ['padrao', 'tarefa', 'iniciado'] as const) {
        const text = renderWaText(step, { ...base, firstName: 'Nome', variant })!;
        expect(text, step).toBeTruthy();
        expect(hasPlaceholder(text), step).toBe(false);
        expect(text, step).not.toMatch(/[–—!]/);
      }
    }
  });
});

describe('quais passos o claim pode entregar agora', () => {
  const day = new Date('2026-10-05T15:00:00Z');
  const full = { quiet: false, hasSurveyLink: true, hasVideosUrl: true, now: day };

  it('de dia, com tudo configurado, todos', () => {
    expect([...waClaimableSteps(full)].sort()).toEqual([...WA_STEPS].sort());
  });

  it('no silêncio, só a T0 (é confirmação de compra)', () => {
    expect(waClaimableSteps({ ...full, quiet: true })).toEqual(['t0']);
  });

  it('sem o segredo do link, nenhuma T0 (ela carrega a pesquisa)', () => {
    const steps = waClaimableSteps({ ...full, hasSurveyLink: false });
    expect(steps).not.toContain('t0');
    expect(steps).not.toContain('t0_antigos');
    expect(steps).toContain('grupo_convite');
  });

  it('sem o link dos vídeos, o passo espera pendente', () => {
    expect(waClaimableSteps({ ...full, hasVideosUrl: false })).not.toContain('videos');
  });

  it('depois que a sala abriu, vídeos não saem mais', () => {
    const steps = waClaimableSteps({ ...full, now: new Date('2026-10-28T22:31:00Z') });
    expect(steps).not.toContain('videos');
    expect(steps).toContain('t0');
  });
});

describe('telefone, motivo e teto', () => {
  it('telefone do job vai só com dígitos, como o worker espera', () => {
    expect(waPhoneDigits('+5562999990001')).toBe('5562999990001');
  });

  it('o SAIR do WhatsApp cobre o número com e sem o nono dígito', () => {
    expect(waAddressVariants('556299990001@s.whatsapp.net').sort()).toEqual(['+556299990001', '+5562999990001'].sort());
    expect(waAddressVariants('5562999990001').sort()).toEqual(['+556299990001', '+5562999990001'].sort());
    expect(waAddressVariants('+447700900123')).toEqual(['+447700900123']);
    expect(waAddressVariants('abc')).toEqual([]);
    expect(waAddressVariants('123@g.us')).toEqual([]);
  });

  it('o motivo do worker é curto e sem nada que pareça dado pessoal', () => {
    expect(waReason('send_http_500')).toBe('send_http_500');
    expect(waReason('not_allowlisted')).toBe('not_allowlisted');
    expect(waReason('maria@x.com')).toBeUndefined();
    expect(waReason('+55 62 99999')).toBeUndefined();
    expect(waReason('x'.repeat(80))).toBeUndefined();
    expect(waReason(undefined)).toBeUndefined();
  });

  it('WA_DAILY_CAP: 150 por padrão, número positivo quando configurado', () => {
    expect(readWaDailyCap(undefined)).toBe(150);
    expect(readWaDailyCap('')).toBe(150);
    expect(readWaDailyCap('0')).toBe(150);
    expect(readWaDailyCap('abc')).toBe(150);
    expect(readWaDailyCap('40')).toBe(40);
  });
});

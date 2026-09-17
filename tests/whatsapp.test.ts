import { describe, expect, it } from 'vitest';
import { WHATSAPP_NUMBER } from '@/lib/constants';

/**
 * O número do WhatsApp aparece no rodapé público de toda página, inclusive nos
 * artigos abertos ao Google. Ele ficou meses como `5562999999999` com um TODO
 * do lado: o link abria uma conversa com ninguém, e ninguém reclama de um link
 * que parece funcionar.
 */
describe('WHATSAPP_NUMBER', () => {
  it('é só dígitos, com código de país, no formato que o wa.me aceita', () => {
    expect(WHATSAPP_NUMBER).toMatch(/^[1-9]\d{10,13}$/);
  });

  it('não é o número provisório nem um número de noves', () => {
    expect(WHATSAPP_NUMBER).not.toBe('5562999999999');
    expect(WHATSAPP_NUMBER).not.toMatch(/9{6,}$/);
  });

  it('é o número pessoal do Kauã nos EUA, o mesmo do site estático', () => {
    expect(WHATSAPP_NUMBER).toBe('15619865175');
  });
});

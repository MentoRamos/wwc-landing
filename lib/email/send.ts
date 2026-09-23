import { Resend } from 'resend';

/**
 * O envio, isolado num lugar só.
 *
 * Mora fora do `core` de propósito: a régua decide quem recebe o quê sem saber
 * que o Resend existe, e é por isso que todo caso difícil dela é testável sem
 * subir rede. Aqui só tem a parte que fala com o mundo.
 */
export type SendResult = { ok: true } | { ok: false; error: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !from) {
    return { ok: false, error: 'RESEND_API_KEY ou RESEND_FROM não estão configurados.' };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'falha desconhecida' };
  }
}

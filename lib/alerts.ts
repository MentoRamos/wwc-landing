import { sendEmail } from '@/lib/email/send';

/**
 * O aviso que chega no Kauã quando alguma coisa da cobrança falhou.
 *
 * O webhook responde 200 para quase tudo, e por um bom motivo: a Kiwify repete
 * o que não é 2xx, e reentrega não conserta bug nosso. Só que essa escolha
 * tem um custo — um evento recusado ou não entendido some sem que ninguém
 * saiba, e o primeiro sinal vira a mensagem de alguém que pagou e não entrou.
 *
 * Aqui é onde esse silêncio deixa de existir. O alerta não carrega nome,
 * e-mail nem documento de quem comprou: carrega o que dá para agir sem isso.
 */
const DESTINO = () => process.env.ALERT_EMAIL?.trim() || 'kaua3ramos@gmail.com';

export async function alertAdmin(subject: string, lines: string[]): Promise<void> {
  const html = [
    '<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">',
    `<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#C9A84C;margin:0 0 16px">Wealth &amp; Wellness</p>`,
    `<p style="margin:0 0 12px"><strong>${escapeHtml(subject)}</strong></p>`,
    '<ul style="margin:0 0 16px;padding-left:18px">',
    ...lines.map((l) => `<li>${escapeHtml(l)}</li>`),
    '</ul>',
    '<p style="color:#666;margin:0">Isto é um aviso automático da plataforma.</p>',
    '</div>',
  ].join('');

  const result = await sendEmail(DESTINO(), `[W&W] ${subject}`, html);

  // Um alerta que falha não pode derrubar o caminho que ele observa: quem
  // chamou está no meio de um webhook, e a venda importa mais que o aviso.
  if (!result.ok) console.error('[alerta] não consegui enviar', { error: result.error });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

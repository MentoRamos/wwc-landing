/**
 * Os e-mails do evento, sem rede.
 *
 * Marco 1: só a confirmação (T0), com o texto de `Evento - Pós-compra do
 * Ingresso (mensagens, v1, 24 set 2026).md`, seção 2, adaptado para e-mail
 * (o link da pesquisa vira botão e entra o link do grupo, que é onde sai a
 * sala). A T0 é confirmação de compra, execução do contrato, por isso não
 * leva descadastro; os e-mails de contagem da tarefa 5 levam.
 *
 * Copy Light Copy: sem travessão, sem exclamação, sem "Não é X. É Y.", sem
 * "mesmo que" e sem "sem precisar". O teste confere.
 */

export type Rendered = { subject: string; html: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const P = (text: string) => `<p style="font-size:16px;line-height:1.7;color:#EAE7E1;margin:0 0 16px">${text}</p>`;
const BTN = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#C9A84C;color:#0D0D0D;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px">${label}</a></p>`;

function layout(body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#0D0D0D;color:#EAE7E1;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#C9A84C;margin:0 0 24px">Imersão Performance e Longevidade</p>
    ${body}
    <p style="font-size:14px;line-height:1.7;color:#CFCDC6;margin:28px 0 0">Kauã Ramos</p>
    <p style="font-size:12px;color:#6b6b6b;margin:4px 0 0">Health Manager · Longevidade &amp; Performance</p>
    <p style="font-size:11px;color:#6b6b6b;margin:24px 0 0">Você recebe isto porque comprou o ingresso da imersão. Dúvida sobre o pagamento: responda este e-mail.</p>
  </div>
</body></html>`;
}

export function renderT0Email(input: {
  firstName: string | null;
  surveyUrl: string;
  groupUrl: string;
  variant: 'padrao' | 'tarefa';
}): Rendered {
  const name = input.firstName?.trim();
  const opening = name
    ? `${escapeHtml(name)}, aqui é o Kauã Ramos. O seu ingresso da Imersão Performance e Longevidade está confirmado.`
    : 'Aqui é o Kauã Ramos. O seu ingresso da Imersão Performance e Longevidade está confirmado.';

  const body =
    P(opening) +
    P(
      'Anota na agenda: quarta 28/10 e quinta 29/10, das 19h30 às 21h30, ao vivo no Google Meet. Na quinta eu fico na sala até 22h15 pra quem quiser tirar dúvida.',
    ) +
    P(
      'Antes de tudo, eu tenho um presente pra você: a Ficha da Hora Fixa, a mesma que a gente preenche junto na primeira noite. Pra receber, responde uma pesquisa de dois minutos. A Ficha abre pra download no final.',
    ) +
    BTN(input.surveyUrl, 'Responder a pesquisa') +
    (input.variant === 'tarefa'
      ? P(
          'A turma já começou uma tarefa de 7 dias: anotar toda manhã a hora em que acordou, o HRV contra a média do seu aparelho e a frequência de repouso. Começa amanhã de manhã; os dias que faltarem não atrapalham a noite 2.',
        )
      : '') +
    P(
      `O link da sala e os materiais saem no grupo oficial da imersão no WhatsApp. Se você ainda não entrou, o link é este: <a href="${escapeHtml(input.groupUrl)}" style="color:#C9A84C">${escapeHtml(input.groupUrl)}</a>`,
    ) +
    P('Nos vemos no dia 28.');

  return { subject: 'Ingresso confirmado: Imersão Performance e Longevidade', html: layout(body) };
}

/**
 * O WhatsApp individual do pós-compra, decidido sem rede.
 *
 * Textos de `Evento - Pós-compra do Ingresso (mensagens, v1, 24 set 2026).md`,
 * seção 2, em texto puro (o WhatsApp faz link sozinho). Um link por mensagem,
 * primeira linha com o nome e "aqui é o Kauã Ramos" (risco R1 do design), e
 * o SAIR na T0.
 *
 * O claim do banco (`claim_wa_jobs`) decide quem está liberado; este arquivo
 * decide que passos podem sair agora e com que texto. Passo sem texto
 * possível (sem o segredo do link, sem o link dos vídeos) não entra no claim
 * e espera pendente: não é bloqueado, porque a configuração resolve.
 *
 * Copy Light Copy: sem travessão, sem exclamação. O teste confere.
 */

import { EVENT_NIGHT_1, type T0Variant } from './evento.core';

/** Gravação das duas noites, R$ 67 (decidido em 24/09). */
export const RECORDING_CHECKOUT_URL = 'https://pay.kiwify.com.br/6sOFaf6';

export const WA_STEPS = ['t0', 't0_antigos', 'gravacao_oferta', 'gravacao_incluida', 'grupo_convite', 'videos'] as const;
export type WaStep = (typeof WA_STEPS)[number];

export type WaTextInput = {
  firstName: string | null;
  variant: T0Variant;
  surveyUrl?: string;
  groupUrl: string;
  videosUrl?: string;
};

const AGENDA =
  'Anota na agenda: quarta 28/10 e quinta 29/10, das 19h30 às 21h30, ao vivo no Google Meet. Na quinta eu fico na sala até 22h15 pra quem quiser tirar dúvida.';
const STARTED =
  'A imersão já começou. As noites são quarta 28/10 e quinta 29/10, das 19h30 às 21h30, ao vivo no Google Meet, e o replay fica no grupo oficial da imersão no WhatsApp até domingo, 01/11, às 23h59.';
const GIFT = (url: string) =>
  `Antes de tudo, eu tenho um presente pra você: a Ficha da Hora Fixa, a mesma que a gente preenche junto na primeira noite. Pra receber, responde uma pesquisa de dois minutos. A Ficha abre pra download no final: ${url}`;
const TASK =
  'A turma já começou uma tarefa de 7 dias: anotar toda manhã a hora em que acordou, o HRV contra a média do seu aparelho e a frequência de repouso. Começa amanhã de manhã; os dias que faltarem não atrapalham a noite 2.';
const OPT_OUT = '(Se não quiser receber mensagens da imersão por aqui, responde SAIR.)';

/** "Maria, resto" ou "Resto": sem nome, a frase não abre com vírgula solta. */
function greet(name: string | null, rest: string): string {
  const clean = name?.trim();
  return clean ? `${clean}, ${rest}` : rest.charAt(0).toLocaleUpperCase('pt-BR') + rest.slice(1);
}

const paragraphs = (...items: Array<string | false>) => items.filter(Boolean).join('\n\n');

/** O texto do passo, ou null quando falta o que ele precisa (ou o passo não é de WhatsApp). */
export function renderWaText(step: string, input: WaTextInput): string | null {
  const name = input.firstName;
  switch (step) {
    case 't0':
    case 't0_antigos': {
      if (!input.surveyUrl) return null;
      const opening =
        step === 't0_antigos'
          ? greet(name, 'aqui é o Kauã Ramos. Você garantiu o seu ingresso da imersão, e eu separei um presente pra quem já está dentro.')
          : greet(name, 'aqui é o Kauã Ramos. O seu ingresso da Imersão Performance e Longevidade está confirmado.');
      if (step === 't0' && input.variant === 'iniciado') {
        return paragraphs(
          opening,
          STARTED,
          GIFT(input.surveyUrl),
          `O link da sala, o replay e os materiais estão no grupo. Entra por aqui: ${input.groupUrl}`,
          OPT_OUT,
        );
      }
      return paragraphs(
        opening,
        AGENDA,
        GIFT(input.surveyUrl),
        step === 't0' && input.variant === 'tarefa' && TASK,
        'Nos vemos no dia 28.',
        OPT_OUT,
      );
    }
    case 'gravacao_oferta':
      return paragraphs(
        'Voltei rapidinho pra saber se a pesquisa funcionou e se a Ficha abriu direitinho.',
        'E aproveitando, eu quero te trazer uma oportunidade. A imersão é ao vivo, e o replay fica no grupo só até domingo, 01/11, às 23h59. Se a sua agenda tem viagem, jantar ou call tarde, e você quer rever a Ficha e a leitura dos 30 dias com calma, eu organizei a gravação das duas noites em formato de curso, com os quatro materiais em PDF e acesso por 12 meses. Custa R$ 67.',
        `Se fizer sentido pra você, é por aqui: ${RECORDING_CHECKOUT_URL}`,
      );
    case 'gravacao_incluida':
      return paragraphs(
        greet(
          name,
          'mais uma coisa. Quando você garantiu o seu ingresso, a promessa era "ao vivo, com gravação". Eu decidi mudar essa promessa pra quem comprar dali pra frente: agora o ingresso dá direito a replay das duas noites até domingo, 01/11, e a gravação com 12 meses de acesso virou um produto à parte.',
        ),
        'Isso não muda nada pra você. A gravação das duas noites, com os quatro materiais em PDF e 12 meses de acesso, continua incluída no seu ingresso, sem nenhum custo a mais. Ela chega na sua área de membros da Kiwify a partir de sexta 30/10, junto com o replay.',
      );
    case 'grupo_convite':
      return paragraphs(
        greet(
          name,
          'a imersão acontece na quarta 28/10 e na quinta 29/10, e o grupo oficial é onde sai tudo: o link da sala do Google Meet, o Roteiro de Leitura, o Painel dos Três Números e o Protocolo das Exceções, a tarefa de 7 dias que começa em 21/10 e o replay. Esses três materiais saem só lá.',
        ),
        `Se você já entrou pela página de obrigado, pode ignorar esta mensagem. Se ainda não, o link é este: ${input.groupUrl}`,
      );
    case 'videos':
      if (!input.videosUrl) return null;
      return `Pode ser que você já me conheça, ou que esteja me conhecendo agora. Eu gravei quatro vídeos curtos, de 2 a 4 minutos cada, pra você chegar na quarta 28/10 já sabendo o que o seu aparelho mede de verdade e o que ele só estima. É conteúdo leve, cabe no intervalo entre duas reuniões: ${input.videosUrl}`;
    default:
      return null;
  }
}

/**
 * Os passos que o claim pode entregar agora.
 *
 * - Silêncio (21h30 às 8h em Brasília): só a T0, que é confirmação de compra.
 *   Os outros esperam; o claim do banco espaça 15 min entre os passos de um
 *   mesmo comprador, então a manhã não vira rajada.
 * - Sem o segredo do link, nenhuma T0 (ela leva a pesquisa).
 * - Sem `EVENTO_VIDEOS_URL`, os vídeos esperam; depois que a sala abriu, não
 *   saem mais (ficam pendentes, visíveis no painel).
 */
export function waClaimableSteps(input: {
  quiet: boolean;
  hasSurveyLink: boolean;
  hasVideosUrl: boolean;
  now: Date;
}): WaStep[] {
  if (input.quiet) return input.hasSurveyLink ? ['t0'] : [];
  return WA_STEPS.filter((step) => {
    if (step === 't0' || step === 't0_antigos') return input.hasSurveyLink;
    if (step === 'videos') return input.hasVideosUrl && input.now.getTime() < EVENT_NIGHT_1.getTime();
    return true;
  });
}

/** O worker quer só dígitos (`5562999990001`). */
export function waPhoneDigits(e164: string): string {
  return e164.replace(/\D/g, '');
}

/**
 * Os endereços que um SAIR cobre: o número que respondeu e, sendo do Brasil,
 * a outra forma dele (com e sem o nono dígito), porque o JID que o WhatsApp
 * devolve nem sempre tem o 9 que a pessoa digitou na Kiwify. Grupo (`@g.us`)
 * não é pessoa e não conta.
 */
export function waAddressVariants(raw: string): string[] {
  const value = raw.trim();
  if (/@(?!s\.whatsapp\.net$)/.test(value)) return [];
  const digits = value.replace(/@s\.whatsapp\.net$/, '').replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return [];
  const out = [`+${digits}`];
  if (digits.startsWith('55') && digits.length === 12) out.push(`+${digits.slice(0, 4)}9${digits.slice(4)}`);
  if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') out.push(`+${digits.slice(0, 4)}${digits.slice(5)}`);
  return out;
}

/**
 * O motivo que o worker manda vai para a coluna `error`. Só passa o formato
 * dos motivos dele (`send_http_500`, `not_allowlisted`): qualquer coisa com
 * cara de endereço, telefone ou frase fica de fora.
 */
export function waReason(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value && /^[a-z][a-z0-9_]{0,39}$/.test(value) ? value : undefined;
}

export const DEFAULT_WA_DAILY_CAP = 150;

export function readWaDailyCap(raw: string | undefined): number {
  const value = Number.parseInt(raw?.trim() ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WA_DAILY_CAP;
}

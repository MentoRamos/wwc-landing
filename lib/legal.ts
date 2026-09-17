/**
 * Os fatos sem os quais as páginas legais não podem ser escritas, num lugar só.
 *
 * `controller` e `contactEmail` são obrigatórios porque são o que a LGPD pede
 * para o titular saber a quem reclamar (art. 9º, I e III). `taxId` é opcional
 * de propósito: a lei quer o controlador identificado e alcançável, não o
 * número do documento, e um CPF numa página pública é matéria-prima de fraude.
 * Se o contador pedir, é só preencher — a página passa a mostrar.
 *
 * Enquanto faltar o obrigatório as páginas mostram um aviso visível e ficam
 * noindex, para que um rascunho não vire a política publicada por descuido.
 */
export const LEGAL = {
  /** Razão social ou nome civil de quem responde pelos dados. */
  controller: 'Kauã Bastiani Ramos',
  /** Endereço para exercer os direitos da LGPD. Não use um e-mail pessoal. */
  contactEmail: 'contato@kauaramos.com',
  /** CNPJ ou CPF. Opcional — ver o comentário acima. */
  taxId: '',
} as const;

/** Última mudança relevante no texto das páginas legais. */
export const LEGAL_UPDATED = '2026-09-14';

export function isDraft(legal: { controller: string; contactEmail: string; taxId?: string }) {
  return !legal.controller || !legal.contactEmail;
}

export const LEGAL_IS_DRAFT = isDraft(LEGAL);

/** O que imprimir onde um fato faltando iria. */
export const pending = (value: string, label: string) =>
  value || `[falta preencher: ${label}]`;

/**
 * Quem recebe dado de quem usa kauaramos.com, e o quê.
 *
 * Isto é dado, não parágrafo, porque um teste consegue conferir dado contra o
 * que o repositório de fato integra — e não consegue conferir prosa. O `id` é
 * a amarra: some um serviço novo em `lib/` sem entrada aqui e a suíte reprova.
 *
 * O domínio serve duas coisas ao mesmo tempo — o funil público (iscas, chat,
 * anamnese) e a plataforma com login — então a lista cobre as duas. Uma
 * política que descreve só metade do que o site faz é uma política falsa.
 */
export type Processor = {
  id: string;
  name: string;
  /** O que esse serviço recebe. */
  gets: string;
  /** Por que ele precisa disso. */
  why: string;
};

export const PROCESSORS: readonly Processor[] = [
  {
    id: 'google',
    name: 'Google',
    gets: 'seu nome, e-mail e foto de perfil na entrada; o que você escreve no chat do site',
    why: 'autenticar quem entra na plataforma e gerar a resposta do chat',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    gets: 'sua conta e o registro do que você tem direito de ver',
    why: 'é o banco de dados e a autenticação, com os dados hospedados em São Paulo',
  },
  {
    id: 'kiwify',
    name: 'Kiwify',
    gets: 'nome, e-mail, telefone e CPF informados na compra, e os dados do cartão',
    why: 'processa o pagamento da assinatura; os dados do cartão nunca passam por nós',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    gets: 'dados do seu navegador, quando um replay é tocado',
    why: 'hospeda as gravações dos encontros',
  },
  {
    id: 'resend',
    name: 'Resend',
    gets: 'seu nome e e-mail',
    why: 'envia os e-mails que você pediu para receber',
  },
  {
    id: 'meta',
    name: 'Meta',
    gets: 'quais páginas públicas você viu, e só se você aceitar os cookies',
    why: 'medir o que funciona no site; recusar impede o carregamento',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    gets: 'os dados técnicos de qualquer requisição, como endereço IP',
    why: 'hospeda e serve as páginas',
  },
];

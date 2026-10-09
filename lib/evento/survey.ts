import { z } from 'zod';

/**
 * A pesquisa de qualificação da Imersão: 8 perguntas e o consentimento, no
 * texto de `Evento - Pós-compra do Ingresso (mensagens, v1, 24 set 2026).md`,
 * seção 3. Mora fora do `'use server'` porque exporta valores (as perguntas),
 * e um módulo de action só pode exportar função async.
 *
 * O que ficou de fora de propósito, como no texto-base: diagnóstico,
 * medicação, condição de saúde, peso, exames. É dado sensível pela LGPD e não
 * é necessário para preparar as noites nem para qualificar.
 */

type Option = { value: string; label: string };
export type Question =
  | { name: string; label: string; kind: 'single' | 'multi'; options: readonly Option[]; max?: number; hint?: string }
  | { name: string; label: string; kind: 'times'; fields: readonly { name: string; label: string }[] };

const APARELHO = [
  { value: 'whoop', label: 'Whoop' },
  { value: 'oura', label: 'Oura' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'apple_watch', label: 'Apple Watch' },
  { value: 'outro', label: 'Outro' },
  { value: 'nenhum', label: 'Ainda não uso' },
] as const;
const TEMPO_USO = [
  { value: 'menos_6m', label: 'Menos de 6 meses' },
  { value: '6m_2a', label: 'De 6 meses a 2 anos' },
  { value: 'mais_2a', label: 'Mais de 2 anos' },
] as const;
const ATIVIDADE = [
  { value: 'socio_ceo', label: 'Sócio, fundador ou CEO' },
  { value: 'diretor', label: 'Diretor ou executivo' },
  { value: 'medico', label: 'Médico' },
  { value: 'outro_saude', label: 'Outro profissional de saúde' },
  { value: 'liberal', label: 'Profissional liberal ou autônomo' },
  { value: 'outro', label: 'Outro' },
] as const;
const RENDA = [
  { value: 'ate_20k', label: 'Até R$ 20 mil' },
  { value: '20k_50k', label: 'De R$ 20 mil a R$ 50 mil' },
  { value: '50k_100k', label: 'De R$ 50 mil a R$ 100 mil' },
  { value: 'acima_100k', label: 'Acima de R$ 100 mil' },
  { value: 'prefiro_nao', label: 'Prefiro não responder' },
] as const;
const DESTRAVAR = [
  { value: 'energia', label: 'Chegar com energia no fim do dia' },
  { value: 'sono_regular', label: 'Ter um horário de sono regular' },
  { value: 'entender_aparelho', label: 'Entender o que o meu aparelho mostra' },
  { value: 'treino', label: 'Render mais no treino' },
  { value: 'longevidade', label: 'Cuidar da longevidade e da prevenção' },
  { value: 'outro', label: 'Outro' },
] as const;
const QUEM_LE = [
  { value: 'ninguem', label: 'Ninguém, eu mesmo' },
  { value: 'medico', label: 'Meu médico, no check-up' },
  { value: 'personal_nutri', label: 'Personal ou nutricionista' },
  { value: 'parei', label: 'Já tive acompanhamento e parei' },
  { value: 'outro', label: 'Outro' },
] as const;
const INVESTIMENTO = [
  { value: 'ate_500', label: 'Até R$ 500' },
  { value: '500_1500', label: 'De R$ 500 a R$ 1.500' },
  { value: '1500_3000', label: 'De R$ 1.500 a R$ 3.000' },
  { value: 'acima_3000', label: 'Acima de R$ 3.000' },
  { value: 'nao_pensei', label: 'Ainda não pensei nisso' },
] as const;

export const QUESTIONS: readonly Question[] = [
  { name: 'aparelho', label: 'Qual aparelho você usa hoje?', kind: 'multi', options: APARELHO, hint: 'Pode marcar mais de um.' },
  { name: 'tempo_uso', label: 'Há quanto tempo você usa?', kind: 'single', options: TEMPO_USO },
  {
    name: 'acorda',
    label: 'Em que horário você costuma acordar num dia útil? E no sábado?',
    kind: 'times',
    fields: [
      { name: 'acorda_util', label: 'Dia útil' },
      { name: 'acorda_sabado', label: 'Sábado' },
    ],
  },
  { name: 'atividade', label: 'O que melhor descreve a sua atividade hoje?', kind: 'single', options: ATIVIDADE },
  { name: 'renda', label: 'Qual a sua renda mensal pessoal?', kind: 'single', options: RENDA },
  {
    name: 'destravar',
    label: 'O que você mais quer destravar nos próximos 90 dias?',
    kind: 'multi',
    options: DESTRAVAR,
    max: 2,
    hint: 'Até duas.',
  },
  { name: 'quem_le', label: 'Hoje, quem lê os seus dados com você?', kind: 'single', options: QUEM_LE },
  {
    name: 'investimento',
    label:
      'Se ao fim da imersão fizer sentido ter alguém lendo o seu dado toda semana, quanto você investiria por mês nisso?',
    kind: 'single',
    options: INVESTIMENTO,
  },
];

/** Troque a versão sempre que o texto mudar: o banco guarda qual a pessoa aceitou. */
export const CONSENT_VERSION = '2026-09-24-v1';
export const CONSENT_TEXT =
  'Autorizo o Kauã Ramos a usar estas respostas pra preparar a imersão e pra falar comigo sobre acompanhamento. As respostas não são compartilhadas com terceiros.';

const values = <T extends readonly Option[]>(options: T) =>
  options.map((option) => option.value) as [T[number]['value'], ...T[number]['value'][]];

const shortTime = z.string().trim().min(1).max(40);

const schema = z
  .object({
    aparelho: z.array(z.enum(values(APARELHO))).min(1).max(APARELHO.length),
    tempo_uso: z.enum(values(TEMPO_USO)).optional(),
    acorda_util: shortTime,
    acorda_sabado: shortTime,
    atividade: z.enum(values(ATIVIDADE)),
    renda: z.enum(values(RENDA)),
    destravar: z.array(z.enum(values(DESTRAVAR))).min(1).max(2),
    quem_le: z.enum(values(QUEM_LE)),
    investimento: z.enum(values(INVESTIMENTO)),
    consentimento: z.literal('on'),
    origem: z.enum(['t0', 'grupo', 'antigos', 'email']).catch('email'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(254))
      .optional(),
    t: z.string().max(200).optional(),
  })
  // Quem ainda não usa aparelho não tem "há quanto tempo".
  .refine((data) => data.tempo_uso !== undefined || (data.aparelho.length === 1 && data.aparelho[0] === 'nenhum'), {
    path: ['tempo_uso'],
  });

export type SurveyAnswers = Omit<z.infer<typeof schema>, 'consentimento' | 'origem' | 'email' | 't'>;
export type SurveySubmission = {
  answers: SurveyAnswers;
  origin: 't0' | 'grupo' | 'antigos' | 'email';
  email?: string;
  token?: string;
};

export function readSurveyForm(data: FormData): { ok: true; value: SurveySubmission } | { ok: false } {
  const one = (key: string) => {
    const value = data.get(key);
    return typeof value === 'string' && value !== '' ? value : undefined;
  };
  const many = (key: string) => data.getAll(key).filter((value): value is string => typeof value === 'string');

  const parsed = schema.safeParse({
    aparelho: many('aparelho'),
    tempo_uso: one('tempo_uso'),
    acorda_util: one('acorda_util') ?? '',
    acorda_sabado: one('acorda_sabado') ?? '',
    atividade: one('atividade'),
    renda: one('renda'),
    destravar: many('destravar'),
    quem_le: one('quem_le'),
    investimento: one('investimento'),
    consentimento: one('consentimento'),
    origem: one('origem'),
    email: one('email'),
    t: one('t'),
  });
  if (!parsed.success) return { ok: false };

  const { consentimento: _consent, origem, email, t, ...answers } = parsed.data;
  void _consent;
  return {
    ok: true,
    value: {
      answers,
      origin: origem,
      ...(email ? { email } : {}),
      ...(t ? { token: t } : {}),
    },
  };
}

/** O estado do formulário entre a página e a server action. */
export type SurveyState =
  | { status: 'idle' }
  | { status: 'error'; message: string; needsEmail?: boolean }
  | { status: 'done'; fichaUrl: string | null };

export const SURVEY_INITIAL_STATE: SurveyState = { status: 'idle' };

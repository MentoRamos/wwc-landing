export const EVENT = {
  name: 'Wealth & Wellness Connect',
  tagline: 'A Era do CEO Quantificado',
  subtitle: 'Saúde mensurável, performance previsível.',
  description:
    'O evento premium e curado que reúne CEOs, empresários e executivos de alto nível para explorar como dados de saúde, wearables e biohacking estão redefinindo performance no trabalho e na vida.',
  edition1: {
    date: '13 de março de 2026',
    city: 'Goiânia',
    venue: 'Legado — Ricardo Paranhos',
    attendees: 40,
    duration: '3h15',
    blocks: 6,
  },
  edition2: {
    status: 'Em breve',
    city: 'Nova cidade',
  },
} as const;

export const STATS = [
  { value: '40', label: 'Convidados VIP', suffix: '' },
  { value: '3h15', label: 'De conteúdo premium', suffix: '' },
  { value: '6', label: 'Blocos temáticos', suffix: '' },
  { value: '72', label: 'CEOs reportam burnout', suffix: '%' },
] as const;

export const TOPICS = [
  {
    number: '01',
    title: 'Abertura & Welcome',
    description: 'Recepção premium com coquetel exclusivo e networking estratégico entre os convidados.',
    icon: 'glass',
  },
  {
    number: '02',
    title: 'Keynote: Saúde Mensurável',
    description: 'Por que medir importa mais do que sentir. A revolução dos dados na saúde de quem decide.',
    icon: 'chart',
  },
  {
    number: '03',
    title: 'Trackers Sem Ilusão',
    description: 'Oura, Whoop, Garmin, Apple Watch: análise honesta do que funciona de verdade.',
    icon: 'watch',
  },
  {
    number: '04',
    title: 'Biohacking na Prática',
    description: 'Protocolos baseados em evidência: ice bath, breathwork, sauna e suplementação inteligente.',
    icon: 'bolt',
  },
  {
    number: '05',
    title: 'Painel: Empresários que Medem',
    description: 'Victor (imóveis), Leonardo (patrimônio) e Dr. Amir (medicina) compartilham seus dados e rotinas.',
    icon: 'users',
  },
  {
    number: '06',
    title: 'Encerramento & Próximos Passos',
    description: 'Plano de ação personalizado e conexões que transcendem o evento.',
    icon: 'rocket',
  },
] as const;

export const ICP_BULLETS = [
  'CEOs e fundadores de empresas com faturamento acima de R$1M/ano',
  'Executivos C-level (CFO, COO, CTO) que buscam performance sustentável',
  'Empresários dos setores imobiliário, tecnologia, saúde e financeiro',
  'Profissionais de alta performance que já utilizam wearables',
  'Médicos e profissionais de saúde interessados em longevidade',
] as const;

export const SPEAKERS = [
  {
    name: 'Kauã Ramos',
    role: 'Host & Curador',
    bio: 'CEO da UWell Health Club. Especialista em performance baseada em dados, wearables e protocolos de saúde para executivos.',
    featured: true,
    photo: '/photos/presenting.jpg',
  },
  {
    name: 'Dr. Amir',
    role: 'Médico',
    bio: 'Médico com foco em medicina preventiva e longevidade baseada em dados e biomarcadores.',
    featured: false,
  },
  {
    name: 'Rogério',
    role: 'IBBRA',
    bio: 'Representante da IBBRA — Instituto Brasileiro de Biohacking e Reprogramação Avançada. Protocolos práticos baseados em evidência.',
    featured: false,
  },
] as const;

export const TESTIMONIALS = [
  {
    quote: 'O WWC mudou minha perspectiva sobre saúde. Saí do evento com um plano de ação concreto baseado nos meus próprios dados.',
    name: 'Participante 1ª Edição',
    role: 'CEO, Setor Imobiliário',
  },
  {
    quote: 'Networking de altíssimo nível combinado com conteúdo prático. Não é mais um evento motivacional — é ciência aplicada.',
    name: 'Participante 1ª Edição',
    role: 'Fundador, Tecnologia',
  },
  {
    quote: 'Finalmente um evento que conecta saúde e negócios sem ser superficial. Os protocolos apresentados são reais e mensuráveis.',
    name: 'Participante 1ª Edição',
    role: 'Executivo C-level',
  },
] as const;

export const WHATSAPP_NUMBER = '5562999999999'; // TODO: replace with real number
export const WHATSAPP_MESSAGE = 'Olá! Quero saber mais sobre a 2ª edição do Wealth & Wellness Connect.';

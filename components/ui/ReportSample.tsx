import { sparkPath } from '@/lib/core/sparkline.core';

/**
 * O relatório, mostrado em vez de descrito.
 *
 * A página inteira argumentava "saúde baseada em dados" sem exibir um único
 * número. Para quem já usa Whoop ou Oura e olha métrica todo dia, uma página
 * que só fala sobre dado lê como qualquer outra página de mentoria, e é isso
 * que derruba a leitura de preço.
 *
 * Os números abaixo são FICTÍCIOS e estão rotulados como exemplo na própria
 * tela. Os relatórios reais são de alunos identificáveis: é dado de saúde, e
 * não entra em página pública sem autorização escrita de quem é dono dele.
 */

type Metric = {
  label: string;
  value: string;
  unit?: string;
  series: number[];
  note: string;
};

/*
 * A regularidade vem primeiro de propósito: num estudo de 60.977 pessoas ela
 * previu mortalidade melhor que a duração do sono. É a métrica que o público
 * não olha, e por isso é a que justifica a leitura de alguém.
 */
const METRICS: Metric[] = [
  {
    label: 'Regularidade do sono',
    value: '81',
    unit: '/100',
    series: [62, 58, 64, 71, 69, 78, 81],
    note: 'de 62 para 81 em seis semanas',
  },
  {
    label: 'Variabilidade cardíaca',
    value: '54',
    unit: 'ms',
    series: [41, 39, 44, 46, 45, 51, 54],
    note: 'média da semana, em repouso',
  },
  {
    label: 'Batimento em repouso',
    value: '52',
    unit: 'bpm',
    series: [58, 59, 57, 55, 56, 53, 52],
    note: 'seis batimentos abaixo do começo',
  },
];

const BOX = { width: 132, height: 34, pad: 3 };

export function ReportSample() {
  return (
    <figure className="border border-[var(--border)] bg-[var(--bg-card)]">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
        <span className="eyebrow">Exemplo de relatório</span>
        <span className="text-xs text-[var(--text-4)]">
          Dados fictícios, no formato que chega toda semana
        </span>
      </figcaption>

      <div className="grid gap-px bg-[var(--border)] sm:grid-cols-3">
        {METRICS.map((metric) => (
          <div key={metric.label} className="bg-[var(--bg-card)] px-6 py-7">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
              {metric.label}
            </p>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="stat-num">{metric.value}</span>
              {metric.unit && (
                <span className="text-sm text-[var(--text-3)]">{metric.unit}</span>
              )}
            </p>

            {/* O traço não carrega eixo nem legenda porque não é gráfico de
                análise: é a forma da mudança, que o número sozinho não
                mostra. Quem precisa do eixo está lendo o relatório inteiro,
                não esta amostra. */}
            <svg
              viewBox={`0 0 ${BOX.width} ${BOX.height}`}
              className="mt-5 h-9 w-full"
              fill="none"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <path
                d={sparkPath(metric.series, BOX)}
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <p className="mt-4 text-xs text-[var(--text-3)]">{metric.note}</p>
          </div>
        ))}
      </div>

      {/* A leitura é o produto. Os três números acima qualquer aparelho
          entrega; o que ninguém entrega é alguém dizendo o que fazer na
          segunda de manhã por causa deles. */}
      <div className="border-t border-[var(--border)] px-6 py-7">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
          A leitura da semana
        </p>
        <p className="prose-body mt-4">
          Você dormiu praticamente as mesmas horas do mês passado, mas passou a
          deitar dentro de uma janela de quarenta minutos. Foi isso que levantou
          a variabilidade, não o treino novo. Mantenha a janela nas duas viagens
          da semana que vem e a gente confere no encontro de quinta.
        </p>
      </div>
    </figure>
  );
}

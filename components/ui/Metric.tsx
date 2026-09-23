/**
 * O número que resume alguma coisa, no topo do painel.
 *
 * A área logada só sabia falar em frase: "você tem 7 guias liberados" dentro
 * de um parágrafo. Frase serve para ler, não para conferir — e quem abre o
 * painel está conferindo. O número sozinho, grande, com o rótulo pequeno em
 * cima e a qualificação embaixo, é o gesto que todo painel usa porque
 * funciona: o olho encontra os quatro valores antes de ler qualquer palavra.
 */
export function Metric({
  label,
  value,
  detail,
  tone = 'plain',
}: {
  label: string;
  value: string;
  detail?: string;
  /** `quiet` é para o valor que é palavra, não algarismo, e que fica ridículo em 30px. */
  tone?: 'plain' | 'quiet';
}) {
  return (
    <div className="bg-[var(--bg-card)] px-5 py-4">
      <p className="font-[family-name:var(--font-label)] text-[10px] font-semibold uppercase tracking-[0.17em] text-[var(--text-3)]">
        {label}
      </p>

      <p
        className={
          tone === 'quiet'
            ? 'mt-2.5 font-[family-name:var(--font-display)] text-[1.375rem] leading-snug text-[var(--text-1)]'
            : 'stat-num mt-2.5'
        }
      >
        {value}
      </p>

      {detail && <p className="mt-1.5 text-xs text-[var(--text-4)]">{detail}</p>}
    </div>
  );
}

/**
 * A faixa que agrupa os números.
 *
 * O `gap-px` sobre fundo de borda desenha as divisórias com o próprio
 * espaçamento, então a régua entre dois cartões nunca some no
 * arredondamento de subpixel, que é o defeito clássico de resolver isso com
 * `border-right` e uma exceção no último item.
 */
export function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
      {children}
    </div>
  );
}

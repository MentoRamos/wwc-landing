/**
 * Quanto falta, desenhado.
 *
 * É uma régua, não uma barra de app: 1px de altura sobre a hairline da marca,
 * preenchida em ouro. O número vai junto porque cor sozinha não é informação
 * acessível, e porque "34%" responde a pergunta que a régua só sugere.
 */
export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-px flex-1 bg-[var(--border)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progresso'}
      >
        <div
          className="h-px bg-[var(--accent)] transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="meta shrink-0 text-[var(--text-3)]">{clamped}%</span>
    </div>
  );
}

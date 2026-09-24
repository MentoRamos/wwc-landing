'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type TrilhaPilar = {
  /** Short label for the tab itself. */
  label: string;
  /** Where in the programme this pillar lives (e.g. "Dias 1 a 10"). */
  momento: string;
  title: string;
  lead: string;
  quando: string;
  voce: string;
  eu: string;
  leva: string;
  /** Optional visual under the four fields (baseline numbers, cycle bar). */
  extra?: ReactNode;
};

const FIELDS = [
  { key: 'quando', label: 'Quando' },
  { key: 'voce', label: 'O que você faz' },
  { key: 'eu', label: 'O que eu faço' },
  { key: 'leva', label: 'O que você leva' },
] as const;

/**
 * The Trilha Mestre W&W as a stepper: one pillar at a time, each opened into
 * when it happens, what the client does, what Kauã does and what the client
 * takes away. Depth without a wall of text.
 *
 * WAI-ARIA tabs pattern: `role="tablist"` with roving `tabIndex`, arrow keys
 * (left/right and up/down, since the list is vertical on desktop and
 * horizontal on phones), Home and End; every tab `aria-controls` its panel.
 *
 * Every panel is in the server HTML. Inactive ones carry `hidden`, and the
 * `<noscript>` rule below un-hides all of them and drops the (then useless)
 * tab list, so a reader without JavaScript gets the five pillars stacked.
 *
 * The panel fades in on change only after the first interaction (never on
 * page load, so the server HTML never ships a hidden panel) and never under
 * `prefers-reduced-motion: reduce` (`motion-reduce:animate-none`, plus the
 * scroll back to the top of the stepper jumps instead of gliding).
 */
export function TrilhaTabs({ pilares }: { pilares: TrilhaPilar[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  function select(i: number, { focus = false, keepInView = false } = {}) {
    const next = (i + pilares.length) % pilares.length;
    setActive(next);
    setInteracted(true);
    const tab = tabRefs.current[next];
    if (focus) tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    if (keepInView) {
      const root = rootRef.current;
      if (root && root.getBoundingClientRect().top < 0) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, () => void> = {
      ArrowRight: () => select(active + 1, { focus: true }),
      ArrowDown: () => select(active + 1, { focus: true }),
      ArrowLeft: () => select(active - 1, { focus: true }),
      ArrowUp: () => select(active - 1, { focus: true }),
      Home: () => select(0, { focus: true }),
      End: () => select(pilares.length - 1, { focus: true }),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  return (
    <div ref={rootRef} className="trilha scroll-mt-6 md:grid md:grid-cols-[300px_1fr] md:gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
      <noscript>
        <style>{'.trilha [role="tabpanel"][hidden]{display:block!important}.trilha [role="tablist"]{display:none!important}.trilha [data-trilha-nav]{display:none!important}'}</style>
      </noscript>

      <div
        role="tablist"
        aria-label="Os cinco pilares da Trilha Mestre W&W"
        onKeyDown={onKeyDown}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:sticky md:top-10 md:mx-0 md:flex-col md:gap-1 md:self-start md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {pilares.map((p, i) => {
          const selected = i === active;
          return (
            <button
              key={p.title}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(i)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={`group relative flex min-h-[44px] shrink-0 snap-start items-center gap-3 rounded-full border px-4 py-2 text-left transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C7440] motion-reduce:transition-none md:w-full md:rounded-none md:border-0 md:border-l-2 md:px-5 md:py-4 ${
                selected
                  ? 'border-[#0D0D0D] bg-[#0D0D0D] text-[#F4F2EE] md:border-l-[#8C7440] md:bg-[#FCFBF8] md:text-[#0D0D0D]'
                  : 'border-[rgba(13,13,13,0.16)] text-[rgba(13,13,13,0.7)] hover:border-[rgba(13,13,13,0.4)] hover:text-[#0D0D0D] md:border-l-[rgba(13,13,13,0.12)] md:hover:bg-[rgba(252,251,248,0.6)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`font-display text-[0.9375rem] md:text-[1.125rem] ${selected ? 'text-[#C9A84C] md:text-[#8C7440]' : 'text-[rgba(13,13,13,0.4)]'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex flex-col">
                <span className="text-[0.9375rem] font-medium whitespace-nowrap md:text-[1.0625rem] md:whitespace-normal">
                  {p.label}
                </span>
                <span
                  className={`hidden text-[0.75rem] uppercase tracking-[0.12em] md:block ${selected ? 'text-[#8C7440]' : 'text-[rgba(13,13,13,0.45)]'}`}
                >
                  {p.momento}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 md:mt-0">
        {pilares.map((p, i) => {
          const selected = i === active;
          const next = pilares[(i + 1) % pilares.length];
          const isLast = i === pilares.length - 1;
          return (
            <div
              key={p.title}
              id={panelId(i)}
              role="tabpanel"
              aria-labelledby={tabId(i)}
              tabIndex={0}
              hidden={!selected}
              className={`border border-[rgba(13,13,13,0.1)] bg-[#FCFBF8] p-6 shadow-[0_18px_50px_rgba(13,13,13,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C7440] md:p-10 [&+&]:mt-6 ${
                interacted && selected ? 'animate-[trilha-in_0.5s_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none' : ''
              }`}
            >
              <p className="text-[0.8125rem] uppercase tracking-[0.12em] text-[#8C7440]">
                Pilar {String(i + 1).padStart(2, '0')} de {String(pilares.length).padStart(2, '0')} · {p.momento}
              </p>
              <h3 className="mt-3 font-display text-[1.5rem] leading-[1.15] tracking-[-0.01em] text-[#0D0D0D] md:text-[2rem]">
                {p.title}
              </h3>
              <p className="mt-4 max-w-[680px] text-[1.0625rem] leading-[1.6] text-[#2a2a2a] md:text-[1.125rem]">{p.lead}</p>

              <dl className="mt-8 grid gap-x-10 gap-y-6 border-t border-[rgba(13,13,13,0.1)] pt-8 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <dt className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-[#8C7440]">{f.label}</dt>
                    <dd className="mt-2 text-[1rem] leading-[1.6] text-[#2a2a2a]">{p[f.key]}</dd>
                  </div>
                ))}
              </dl>

              {p.extra ? <div className="mt-8">{p.extra}</div> : null}

              <div data-trilha-nav className="mt-8 flex items-center justify-between gap-4 border-t border-[rgba(13,13,13,0.1)] pt-6">
                <span className="text-[0.8125rem] tabular-nums text-[rgba(13,13,13,0.45)]">
                  {i + 1} / {pilares.length}
                </span>
                <button
                  type="button"
                  onClick={() => select(i + 1, { keepInView: true })}
                  className="group inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium text-[#0D0D0D] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C7440]"
                >
                  {isLast ? 'Voltar ao primeiro pilar' : `Próximo: ${next.label}`}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  >
                    {isLast ? '↺' : '→'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

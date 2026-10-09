'use client';

import { startTransition, useActionState, useState } from 'react';
import { submitSurvey } from '@/app/imersao/pesquisa/actions';
import { CONSENT_TEXT, QUESTIONS, SURVEY_INITIAL_STATE, type Question } from '@/lib/evento/survey';

/**
 * O formulário da pesquisa da imersão. Client só pelo `useActionState` (o
 * estado de envio e a tela final com a Ficha) e pelo limite de duas opções
 * na pergunta 6; quem decide o que vale é o zod na server action.
 *
 * O envio passa por `onSubmit` + `startTransition` em vez de `action={...}`
 * no form: com `action`, o React limpa o formulário ao terminar, e quem
 * errou o e-mail perderia as oito respostas junto.
 */
const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-full bg-[#C9A84C] px-8 py-[18px] ' +
  'text-[1.0625rem] font-semibold text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C] ' +
  'disabled:opacity-60 sm:w-auto';
const BODY_DARK = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[rgba(244,242,238,0.78)]';
const CARD = 'border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-8';
const LEGEND = 'font-display text-[1.25rem] leading-[1.3] text-[var(--text-1)]';
const OPTION = 'flex items-start gap-3 py-2 text-[1.0625rem] leading-[1.5] text-[rgba(244,242,238,0.88)]';
const INPUT =
  'mt-2 w-full rounded-none border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[1.0625rem] ' +
  'text-[var(--text-1)] outline-none focus:border-[var(--accent)]';

export function SurveyForm(props: { token: string | null; origin: string }) {
  const [state, action, pending] = useActionState(submitSurvey, SURVEY_INITIAL_STATE);

  if (state.status === 'done') {
    return (
      <div className={`${CARD} mt-10`}>
        <p className={BODY_DARK}>
          Obrigado. Aqui está a sua Ficha da Hora Fixa. Imprime ou deixa aberta na quarta 28/10, às 19h30: a gente
          preenche junto, campo a campo.
        </p>
        {state.fichaUrl ? (
          <>
            <a href={state.fichaUrl} className={`${CTA_CLASS} mt-8`} data-cta="ficha">
              BAIXAR A FICHA
            </a>
            <p className="mt-4 text-[0.9375rem] text-[rgba(244,242,238,0.6)]">
              O link vale por 10 minutos. Se expirar, é só enviar a pesquisa de novo por esta página.
            </p>
          </>
        ) : (
          <p className={`mt-6 ${BODY_DARK}`}>
            Suas respostas foram salvas. A Ficha ainda não está disponível para download. Volte a este link mais tarde e
            envie de novo, que ela abre no final.
          </p>
        )}
      </div>
    );
  }

  const askEmail = !props.token || (state.status === 'error' && state.needsEmail);

  return (
    <form
      className="mt-10 grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {props.token ? <input type="hidden" name="t" value={props.token} /> : null}
      <input type="hidden" name="origem" value={props.origin} />

      {askEmail ? (
        <div className={CARD}>
          <label htmlFor="email" className={LEGEND}>
            Seu e-mail
          </label>
          <p className="mt-2 text-[0.9375rem] text-[rgba(244,242,238,0.6)]">Use o e-mail da compra do ingresso na Kiwify.</p>
          <input id="email" name="email" type="email" required autoComplete="email" className={INPUT} />
        </div>
      ) : null}

      {QUESTIONS.map((question, index) => (
        <QuestionBlock key={question.name} question={question} number={index + 1} />
      ))}

      <div className={CARD}>
        <label className={OPTION}>
          <input type="checkbox" name="consentimento" required className="mt-1 h-5 w-5 accent-[#C9A84C]" />
          <span>{CONSENT_TEXT}</span>
        </label>
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="text-[1.0625rem] text-[#E8A0A0]">
          {state.message}
        </p>
      ) : null}

      <div>
        <button type="submit" disabled={pending} className={CTA_CLASS}>
          {pending ? 'ENVIANDO' : 'ENVIAR E BAIXAR A FICHA'}
        </button>
      </div>
    </form>
  );
}

function QuestionBlock({ question, number }: { question: Question; number: number }) {
  const [picked, setPicked] = useState<string[]>([]);

  if (question.kind === 'times') {
    return (
      <fieldset className={CARD}>
        <legend className={LEGEND}>
          {number}. {question.label}
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {question.fields.map((field) => (
            <label key={field.name} className="block text-[1rem] text-[rgba(244,242,238,0.78)]">
              {field.label}
              <input name={field.name} type="text" required maxLength={40} placeholder="ex.: 6h30" className={INPUT} />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const multi = question.kind === 'multi';
  const full = multi && question.max !== undefined && picked.length >= question.max;

  return (
    <fieldset className={CARD}>
      <legend className={LEGEND}>
        {number}. {question.label}
      </legend>
      {question.hint ? <p className="mt-2 text-[0.9375rem] text-[rgba(244,242,238,0.6)]">{question.hint}</p> : null}
      <div className="mt-3">
        {question.options.map((option) => (
          <label key={option.value} className={OPTION}>
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={question.name}
              value={option.value}
              required={!multi && question.name !== 'tempo_uso'}
              disabled={full && !picked.includes(option.value)}
              onChange={(event) => {
                if (!multi) return;
                const { checked, value } = event.currentTarget;
                setPicked((current) => (checked ? [...current, value] : current.filter((item) => item !== value)));
              }}
              className="mt-1 h-5 w-5 accent-[#C9A84C]"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

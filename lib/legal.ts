/**
 * The three facts the legal pages cannot be written without, in one place.
 *
 * They are empty on purpose. Who the controller is (a person or a company) is
 * the open question with the accountant — the same one that decides whether a
 * recurring subscription is invoiced under a CPF or a CNPJ — and inventing an
 * answer here would put a false statement on a page whose whole value is being
 * true.
 *
 * While any of them is empty the pages render a visible warning and stay
 * noindex, so a draft cannot quietly become the published policy.
 */
export const LEGAL = {
  /** Razão social ou nome civil de quem responde pelos dados. */
  controller: '',
  /** CNPJ ou CPF do controlador. */
  taxId: '',
  /** Endereço para exercer os direitos da LGPD. Não use um e-mail pessoal. */
  contactEmail: '',
} as const;

/** Last meaningful change to the text of the legal pages. */
export const LEGAL_UPDATED = '2026-09-11';

export const LEGAL_IS_DRAFT =
  !LEGAL.controller || !LEGAL.taxId || !LEGAL.contactEmail;

/** What to print where a missing fact would otherwise go. */
export const pending = (value: string, label: string) =>
  value || `[falta preencher: ${label}]`;

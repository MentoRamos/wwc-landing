import { timingSafeEqual } from 'node:crypto';

/**
 * A Vercel manda `Authorization: Bearer $CRON_SECRET` nos cron jobs.
 *
 * A comparação é de tempo constante. Um `===` vaza o prefixo correto pelo
 * tempo de resposta, e um segredo de cron é adivinhável byte a byte por quem
 * tiver paciência — pouco provável pela rede, barato de evitar.
 *
 * Sem segredo configurado a resposta é não. Um cron que aceita todo mundo
 * quando a variável some é pior que um cron que para de rodar, porque o
 * segundo alguém percebe.
 */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim();
  if (!expected || !header) return false;

  const given = Buffer.from(header);
  const want = Buffer.from(`Bearer ${expected}`);
  if (given.length !== want.length) return false;

  return timingSafeEqual(given, want);
}

import { z } from 'zod';
import { resolveSiteUrl } from '@/lib/core/site.core';
import { signLinkToken } from '@/lib/core/evento.core';
import { readWaDailyCap } from '@/lib/core/evento-wa.core';

/**
 * As variáveis de ambiente do evento, validadas num lugar só.
 *
 * Nenhuma tem valor padrão que abra alguma coisa: sem `EVENTO_MODE=live` o
 * comprador de verdade não recebe e-mail, sem `EVENTO_LINK_SECRET` não há
 * link de pesquisa (a T0 espera), sem allowlist o comprador de teste não
 * recebe nada.
 */
const list = z
  .string()
  .optional()
  .transform((raw) =>
    (raw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const schema = z.object({
  EVENTO_MODE: z.string().optional(),
  EVENTO_SANDBOX_ALLOWLIST: list.transform((items) => items.filter((item) => z.email().safeParse(item).success)),
  EVENTO_TEST_PRODUCT_IDS: list,
  // 32 caracteres é o mínimo para um HMAC que ninguém adivinha; menos que
  // isso é tratado como ausente, e ausente fecha.
  EVENTO_LINK_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length >= 32 ? value.trim() : undefined)),
});

export type EventoConfig = {
  mode: string | undefined;
  sandboxAllowlist: string[];
  testProductIds: string[];
  linkSecret: string | undefined;
};

export function eventoConfig(): EventoConfig {
  const env = schema.parse({
    EVENTO_MODE: process.env.EVENTO_MODE,
    EVENTO_SANDBOX_ALLOWLIST: process.env.EVENTO_SANDBOX_ALLOWLIST,
    EVENTO_TEST_PRODUCT_IDS: process.env.EVENTO_TEST_PRODUCT_IDS,
    EVENTO_LINK_SECRET: process.env.EVENTO_LINK_SECRET,
  });
  return {
    mode: env.EVENTO_MODE,
    sandboxAllowlist: env.EVENTO_SANDBOX_ALLOWLIST,
    testProductIds: env.EVENTO_TEST_PRODUCT_IDS,
    linkSecret: env.EVENTO_LINK_SECRET,
  };
}

/**
 * O link pessoal da pesquisa: domínio público + token, nunca o e-mail.
 * `from = 'antigos'` marca a origem da resposta (`?o=antigos`, que a página
 * da pesquisa já lê) para a T0 dos compradores do backfill.
 */
export function surveyUrl(buyerId: string, secret: string, from?: 'antigos'): string {
  const origin = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  const query = `t=${encodeURIComponent(signLinkToken(buyerId, secret))}${from ? `&o=${from}` : ''}`;
  return `${origin}/imersao/pesquisa?${query}`;
}

export type WaConfig = {
  /** Kill switch: só `WA_ENABLED=true` libera o claim. Ausente fecha. */
  enabled: boolean;
  dailyCap: number;
  /** `EVENTO_VIDEOS_URL`, só se for https. Sem ele o passo `videos` espera. */
  videosUrl: string | undefined;
  /** `EVENTO_ANTIGOS_LIBERADO=true`: o OK do Kauã para o envio aos compradores do backfill. */
  antigosReleased: boolean;
};

export function waConfig(): WaConfig {
  const videos = process.env.EVENTO_VIDEOS_URL?.trim();
  return {
    enabled: process.env.WA_ENABLED?.trim().toLowerCase() === 'true',
    dailyCap: readWaDailyCap(process.env.WA_DAILY_CAP),
    // O valor cru, não o `href` normalizado: um marcador esquecido na
    // variável (`https://.../[LINK]`) tem que continuar visível para a guarda.
    videosUrl: videos && isHttps(videos) ? videos : undefined,
    antigosReleased: process.env.EVENTO_ANTIGOS_LIBERADO?.trim().toLowerCase() === 'true',
  };
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

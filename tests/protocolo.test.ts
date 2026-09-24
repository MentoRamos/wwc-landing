import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONDICAO_RESOLVIDA,
  PROTOCOLO_CHECKOUT_URL_180D,
  PROTOCOLO_CHECKOUT_URL_90D,
  WHATSAPP_NUMBER,
  protocoloCtaHref,
  whatsappHref,
} from '@/lib/protocolo';
import { commentMask } from './helpers/source';

/** Only the code, same convention as `imersao.test.ts`: a doc comment is
 *  allowed to explain a rule using words the rule itself forbids on the
 *  visible page (e.g. mentioning a bracket placeholder to say it must never
 *  render one). */
function code(source: string): string {
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

const PAGE_PATH = join(process.cwd(), 'app/imersao/protocolo/page.tsx');
const STICKY_PATH = join(process.cwd(), 'components/protocolo/StickyBuyBar.tsx');
const ANALYTICS_PATH = join(process.cwd(), 'components/protocolo/ProtocoloAnalytics.tsx');
const LIB_PATH = join(process.cwd(), 'lib/protocolo.ts');

const page = () => readFileSync(PAGE_PATH, 'utf8');
const stickyBar = () => readFileSync(STICKY_PATH, 'utf8');
const analytics = () => readFileSync(ANALYTICS_PATH, 'utf8');
const lib = () => readFileSync(LIB_PATH, 'utf8');

describe('lib/protocolo helpers', () => {
  it('exposes both Kiwify checkout URLs, 180d as the default plan', () => {
    expect(PROTOCOLO_CHECKOUT_URL_180D).toBe('https://pay.kiwify.com.br/TMQPoAC');
    expect(PROTOCOLO_CHECKOUT_URL_90D).toBe('https://pay.kiwify.com.br/ALCqRbo');
    expect(protocoloCtaHref()).toBe(PROTOCOLO_CHECKOUT_URL_180D);
    expect(protocoloCtaHref('180d')).toBe(PROTOCOLO_CHECKOUT_URL_180D);
    expect(protocoloCtaHref('90d')).toBe(PROTOCOLO_CHECKOUT_URL_90D);
  });

  it('builds a wa.me link to the WhatsApp profissional with the message URL-encoded', () => {
    const href = whatsappHref('Oi Kauã, teste.');
    expect(href.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(href).toContain(encodeURIComponent('Oi Kauã, teste.'));
    expect(WHATSAPP_NUMBER).toBe('15619865175');
  });

  it('the condição dates are unresolved placeholders, so the page must stay noindex', () => {
    expect(CONDICAO_RESOLVIDA).toBe(false);
  });
});

describe('/imersao/protocolo page', () => {
  it('exists as its own route, separate from /imersao', () => {
    expect(() => page()).not.toThrow();
  });

  it('renders exactly one h1', () => {
    const h1Matches = [...page().matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1Matches).toHaveLength(1);
  });

  it('never shows a price anywhere on the page (price lives only in the live pitch)', () => {
    const source = code(page());
    expect(/R\$\s?\d/.test(source)).toBe(false);
    expect(source).not.toContain('12.600');
    expect(source).not.toContain('12600');
    expect(source).not.toContain('6.900');
    expect(source).not.toContain('6900');
  });

  it('never renders a bracket placeholder from the copy doc', () => {
    const source = code(page());
    expect(source).not.toMatch(/\[PRAZO DA CONDI/);
    expect(source).not.toMatch(/\[SEMANA DO ONBOARDING\]/);
    expect(source).not.toMatch(/\[PRÓXIMA TURMA\]/);
    // General guard: no all-caps bracket placeholder of any kind survives to the page.
    expect(source).not.toMatch(/\[[A-ZÀ-Ú][A-ZÀ-Ú ]{2,}\]/);
  });

  it('never uses an em dash, matching the Light Copy rules applied to this copy', () => {
    expect(code(page())).not.toContain('—');
  });

  it('stays noindex while any condição placeholder is null, the same pattern /imersao used for its null checkout', () => {
    const source = page();
    expect(source).toMatch(/import \{\s*CONDICAO_RESOLVIDA/);
    expect(source).toContain('...(CONDICAO_RESOLVIDA ? {} : { robots: { index: false, follow: false } })');
  });

  it('declares title, description and Open Graph metadata', () => {
    const source = page();
    expect(source).toContain('export const metadata: Metadata');
    expect(source).toContain('openGraph:');
    expect(source).toContain("locale: 'pt_BR'");
    expect(source).toContain('twitter:');
  });

  it('mounts the Meta Pixel, the protocolo analytics listener and the sticky buy bar exactly once', () => {
    const source = page();
    expect([...source.matchAll(/<MetaPixel\s*\/>/g)]).toHaveLength(1);
    expect([...source.matchAll(/<ProtocoloAnalytics\s*\/>/g)]).toHaveLength(1);
    expect([...source.matchAll(/<ProtocoloStickyBuyBar\s*\/>/g)]).toHaveLength(1);
  });

  it('every checkout CTA is built from protocoloCtaHref(), never a literal Kiwify URL', () => {
    const source = code(page());
    expect(source).not.toContain('https://pay.kiwify.com.br/');

    const hrefs = [...source.matchAll(/href=\{([^}]*)\}/g)].map((m) => m[1].trim());
    // Exclude the testimonial "open full-size print" zoom links, same exclusion
    // /imersao's own suite makes for `href={d.src}`.
    const ctaHrefs = hrefs.filter((h) => h !== 'd.src');
    expect(ctaHrefs.length).toBeGreaterThanOrEqual(5);
    for (const href of ctaHrefs) {
      const isCheckout = /^(cta180|cta90|protocoloCtaHref\()/.test(href);
      const isWhatsapp = /^(ctaWhats\w*|whatsappHref\()/.test(href);
      expect(isCheckout || isWhatsapp).toBe(true);
    }
  });

  it('never hardcodes the WhatsApp number or a raw wa.me URL, only whatsappHref()', () => {
    const source = code(page());
    expect(source).not.toContain('https://wa.me/');
    expect(source).toContain('whatsappHref(');
  });

  it('marks every CTA anchor with a data-cta attribute', () => {
    const source = code(page());
    const ctaAnchors = [...source.matchAll(/<a\s[^>]*href=\{(?:cta180|cta90|ctaWhats\w*|protocoloCtaHref\(|whatsappHref\()[^>]*>/g)];
    expect(ctaAnchors.length).toBeGreaterThanOrEqual(5);
    for (const [tag] of ctaAnchors) {
      expect(tag).toMatch(/data-cta="[^"]+"/);
    }
  });

  it('offers both the 180d and the 90d plan, 180d always presented first/primary', () => {
    const source = code(page());
    expect(source).toMatch(/protocoloCtaHref\(['"]180d['"]\)|cta180\s*=\s*protocoloCtaHref\(['"]180d['"]\)/);
    expect(source).toMatch(/protocoloCtaHref\(['"]90d['"]\)|cta90\s*=\s*protocoloCtaHref\(['"]90d['"]\)/);
  });

  it('shows the 5-guide entitlement and the 90/180 comparison from S4, without inventing a price column', () => {
    const source = code(page());
    expect(source).toContain('O Mínimo Inegociável');
    expect(source).toContain('Fim do Crash das 15h');
    expect(source).toContain('Cardápio Sem Culpa');
    expect(source).toContain('Doce Sem Sabotagem');
    expect(source).toContain('O Mundo é a Academia');
  });

  it('includes the UK Biobank study section with its non-affiliation disclaimer', () => {
    const source = code(page());
    expect(source).toMatch(/UK Biobank/);
    expect(source).toMatch(/30%/);
    expect(source).toMatch(/38%/);
    expect(source).toMatch(/sem relação com o W&W Protocol|Não é resultado de alunos/i);
  });

  it('includes the guarantee section with the 7-day legal right and the 30-day conditional guarantee', () => {
    const source = code(page());
    expect(source).toMatch(/7 dias/);
    expect(source).toMatch(/30 dias/);
  });

  it('includes the FAQ with at least the core questions from the copy doc', () => {
    const source = code(page());
    expect(source).toMatch(/Quanto tempo dura o acompanhamento/);
    expect(source).toMatch(/Como funciona a garantia/);
    expect(source).toMatch(/90 ou 180 dias: qual escolher/);
  });

  it('never names a student anywhere on the page (testimonials are anonymized)', () => {
    const STUDENT_NAMES =
      /tania|morita|renata|borr[aá]s|geraldo|lyla|chirico|alvicto|micaela|giselle|m[oô]nica|fernando|danilo|adriana|marcus/i;
    expect(STUDENT_NAMES.test(code(page()))).toBe(false);
  });

  it('only reuses the 8 already-authorized testimonial prints from /imersao, and every one resolves to a real file', () => {
    const source = code(page());
    const srcs = [...source.matchAll(/\/photos\/depoimentos\/[\w-]+\.jpg/g)].map((m) => m[0]);
    expect(srcs.length).toBeGreaterThanOrEqual(6);
    for (const src of srcs) {
      expect(() => readFileSync(join(process.cwd(), 'public', src))).not.toThrow();
    }
  });

  it('never references unauthorized assets: group prints beyond the 8, weekly report or platform screenshots, or a hero video', () => {
    const source = code(page());
    expect(source).not.toMatch(/\/photos\/depoimentos\/g0\d/);
    expect(source).not.toMatch(/weekly-report|platform-screenshot|app-niva-screenshot/i);
    expect(source).not.toMatch(/<video\b/i);
    // W&W Connect event photos: left out entirely (unresolved "Kauã decide").
    expect(source).not.toMatch(/\/photos\/evento-/);
  });

  it('never claims a shared/community student group; the group is explicitly individual', () => {
    const source = code(page());
    expect(source).not.toMatch(/grupo (compartilhado|de alunos)/i);
  });
});

describe('/imersao/protocolo sticky buy bar', () => {
  it('is a client component gated to mobile, with an accessible landmark', () => {
    const source = stickyBar();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('aria-label');
    expect(source).toContain('md:hidden');
  });

  it('drives visibility off the hero CTA and the closing section via IntersectionObserver', () => {
    const source = stickyBar();
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('data-cta="hero"');
  });

  it('builds its CTA from protocoloCtaHref(), not a literal URL', () => {
    const source = code(stickyBar());
    expect(source).not.toContain('https://pay.kiwify.com.br/');
    expect(source).toContain('protocoloCtaHref(');
  });
});

describe('/imersao/protocolo analytics', () => {
  it('is a client component that tracks scroll depth and CTA clicks', () => {
    const source = analytics();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('ScrollDepth');
    expect(source).toContain('data-cta');
  });

  it('forwards UTM params onto the checkout link via mergeCheckoutUtm', () => {
    const source = analytics();
    expect(source).toContain('mergeCheckoutUtm');
  });
});

describe('lib/protocolo neutral copy while the condição dates are unresolved', () => {
  it('never lets condicaoTexto/proximaTurmaTexto/stickyBar text leak a bracket placeholder', () => {
    const source = lib();
    // The doc comments are allowed to mention the bracket form; only check
    // that CONDICAO is set to null, i.e. still unresolved.
    expect(source).toContain('prazo: null');
    expect(source).toContain('semanaOnboarding: null');
    expect(source).toContain('proximaTurma: null');
  });
});

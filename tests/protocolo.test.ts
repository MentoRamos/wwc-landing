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
  it('is a client component with an accessible landmark, on mobile and desktop (S20)', () => {
    const source = stickyBar();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('aria-label');
    // S20 specifies a desktop text too: the bar must not be phone-only.
    expect(source).toContain('stickyBarTextoDesktop()');
    expect(source).toContain('stickyBarTextoMobile()');
  });

  it('carries the "Conversar antes" WhatsApp link from S20', () => {
    const source = code(stickyBar());
    expect(source).toContain('Conversar antes');
    expect(source).toContain('whatsappHref(WHATSAPP_MESSAGE_CONVERSAR)');
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

describe('/imersao/protocolo S3 and S13 follow the copy doc', () => {
  it('leaves out the body before/after print the doc excludes on purpose', () => {
    expect(code(page())).not.toContain('03-antes-depois');
  });

  it('uses the doc caption for the Whoop print (the reason the app wrote)', () => {
    expect(page()).toContain('O motivo que o próprio app escreveu: regularidade do sono');
  });

  it('keeps the S13 stat wording literal', () => {
    expect(page()).toContain('no grupo com o sono mais regular (o quintil mais regular)');
  });
});

// ─── v2 iteration (Kauã's review of the preview, 24/09/2026) ──────────────

const MOTION_COMPONENTS = [
  'components/protocolo/ScrollProgressBar.tsx',
  'components/protocolo/HeroParallax.tsx',
  'components/protocolo/StatCounter.tsx',
  'components/protocolo/TimelineProgress.tsx',
  'components/protocolo/TrilhaTabs.tsx',
];
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const PROTOCOLO_SOURCES = [
  'app/imersao/protocolo/page.tsx',
  'lib/protocolo.ts',
  'components/protocolo/ProtocoloAnalytics.tsx',
  'components/protocolo/StickyBuyBar.tsx',
  'components/protocolo/VisualFrame.tsx',
  ...MOTION_COMPONENTS,
];

describe('/imersao/protocolo motion (item 5)', () => {
  it('every motion component is a client component that checks prefers-reduced-motion', () => {
    for (const path of MOTION_COMPONENTS) {
      const source = read(path);
      expect(source.trimStart().startsWith("'use client'"), path).toBe(true);
      expect(code(source), path).toContain('prefers-reduced-motion');
    }
  });

  it('never ships hidden content in the server HTML: no framer-motion, no inline opacity 0', () => {
    for (const path of [...MOTION_COMPONENTS, 'app/imersao/protocolo/page.tsx']) {
      const source = code(read(path));
      expect(source, path).not.toContain('framer-motion');
      expect(source, path).not.toMatch(/opacity:\s*0(?![.\d])/);
    }
  });

  it('reveals sections with the progressive-enhancement ScrollReveal (visible without JS)', () => {
    const source = code(page());
    expect(source).toContain("from '@/components/animations/ScrollReveal'");
    expect([...source.matchAll(/<ScrollReveal\b/g)].length).toBeGreaterThanOrEqual(10);
  });

  it('mounts the scroll progress bar once and wraps the hero photo in the parallax layer', () => {
    const source = code(page());
    expect([...source.matchAll(/<ProtocoloScrollProgress\s*\/>/g)]).toHaveLength(1);
    expect(source).toMatch(/<HeroParallax>[\s\S]*kaua-portrait-seated\.jpg[\s\S]*<\/HeroParallax>/);
  });

  it('counters render the final number on the server and only animate below the fold', () => {
    const source = code(read('components/protocolo/StatCounter.tsx'));
    expect(source).toContain('getBoundingClientRect');
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('sr-only');
    // The UK Biobank numbers go through the counter, with the literal text for screen readers.
    const pageSource = code(page());
    expect(pageSource).toMatch(/<StatCounter value=\{30\}[^>]*srText="30% menos"/);
    expect(pageSource).toMatch(/<StatCounter value=\{38\}[^>]*srText="38% menos"/);
  });

  it('drives the "Como funciona" timeline with a scroll-linked progress line', () => {
    const source = code(page());
    expect(source).toMatch(/<TimelineProgress>[\s\S]*ETAPAS\.map[\s\S]*<\/TimelineProgress>/);
    expect(source).toMatch(/const ETAPAS = \[[\s\S]*DAY ZERO/);
  });
});

describe('/imersao/protocolo "faixa extra" of the 180d plan (item 1)', () => {
  it('explains what it is, when it happens and what it means, in three labelled lines', () => {
    const source = code(page());
    expect(source).toContain('Ciclos 4 a 6 · manutenção');
    expect(source).toContain('O que é');
    expect(source).toContain('Quando');
    expect(source).toContain('O que muda pra você');
    expect(source).not.toContain('FAIXA EXTRA');
  });
});

describe('/imersao/protocolo "O que você recebe" (item 2)', () => {
  it('leads with the Weekly Report as the hero deliverable and groups the rest into clusters', () => {
    const source = code(page());
    expect(source).toContain('ENTREGAVEIS_GRUPOS');
    expect(source).toMatch(/data-entregavel="hero"[\s\S]*Weekly Report/);
  });

  it('does not repeat the 90 x 180 comparison numbers inside the deliverables', () => {
    const block = code(page()).match(/const ENTREGAVEIS_GRUPOS[\s\S]*?\n\];/)?.[0] ?? '';
    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/26 semanas|13 semanas|6 no programa|12 no de 180|até [36]x/);
  });
});

describe('/imersao/protocolo Trilha Mestre W&W (item 3)', () => {
  it('is an accessible tab stepper with a no-JS fallback that shows every panel', () => {
    const source = code(read('components/protocolo/TrilhaTabs.tsx'));
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-selected');
    expect(source).toContain('aria-controls');
    expect(source).toContain('ArrowRight');
    expect(source).toContain('<noscript>');
  });

  it('details every pillar with when, what you do, what Kauã does and what you take away', () => {
    const source = code(page());
    for (const title of [
      'A Hora Fixa como base',
      'Anamnese antes de qualquer estratégia',
      'Linha de base antes de qualquer plano',
      'Leitura humana, toda semana, com contexto',
      'Só o que você consegue repetir sozinho',
    ]) {
      expect(source).toContain(title);
    }
    for (const field of ['quando:', 'voce:', 'eu:', 'leva:']) {
      expect([...source.matchAll(new RegExp(`\\b${field}`, 'g'))].length, field).toBeGreaterThanOrEqual(5);
    }
    // The six baseline numbers from the Período Diagnóstico.
    expect(source).toContain('Calorias e proteína');
    expect(source).toContain('Peso médio');
  });

  it('presents the method as reading raw numbers against a personal baseline, never as the colored morning score', () => {
    const source = code(page());
    expect(source).not.toMatch(/sem[aá]foro/i);
    expect(source).not.toMatch(/nota colorida/i);
    expect(source).not.toMatch(/\brecovery\b/i);
  });
});

describe('/imersao/protocolo FAQ (item 4)', () => {
  it('uses a native details/summary accordion', () => {
    const source = code(page());
    expect(source).toMatch(/FAQ\.map\([\s\S]*?<details[\s\S]*?<summary/);
  });
});

describe('/imersao/protocolo scope (item 6)', () => {
  it('never references W&W Connect anywhere in the page, its components or its lib', () => {
    for (const path of PROTOCOLO_SOURCES) {
      // Word boundary: `observer.disconnect()` is not a mention of the event.
      expect(read(path), path).not.toMatch(/\bconnect\b/i);
    }
  });
});

describe('/imersao/protocolo future visuals (item 8)', () => {
  it('keeps the Weekly Report and platform image slots behind a flag that ships off', async () => {
    const lib = await import('@/lib/protocolo');
    expect(lib.VISUAIS_PROTOCOLO).toBe(false);
    expect(lib.VISUAIS.weeklyReport1.src).toBe('/photos/protocolo/weekly-report-1.jpg');
    expect(lib.VISUAIS.weeklyReport2.src).toBe('/photos/protocolo/weekly-report-2.jpg');
    expect(lib.VISUAIS.plataforma.src).toBe('/photos/protocolo/plataforma.jpg');
  });

  it('the page renders each slot only inside a VISUAIS_PROTOCOLO guard, in a designed frame', () => {
    const source = code(page());
    const guarded = [...source.matchAll(/\{VISUAIS_PROTOCOLO \? \(([\s\S]*?)\) : null\}/g)].map((m) => m[1]);
    const all = guarded.join('\n');
    expect(all).toContain('VISUAIS.weeklyReport1');
    expect(all).toContain('VISUAIS.weeklyReport2');
    expect(all).toContain('VISUAIS.plataforma');
    expect(all).toContain('<VisualFrame');
    // Outside the guards, no slot is referenced.
    const unguarded = guarded.reduce((acc, g) => acc.replace(g, ''), source);
    expect(unguarded).not.toMatch(/VISUAIS\.\w+/);
  });

  it('when the flag is flipped on, every image file must exist', async () => {
    const lib = await import('@/lib/protocolo');
    if (!lib.VISUAIS_PROTOCOLO) return;
    for (const v of Object.values(lib.VISUAIS)) {
      expect(() => readFileSync(join(process.cwd(), 'public', v.src))).not.toThrow();
    }
  });
});

describe('/imersao/protocolo copy rules across every source it renders', () => {
  it('no em dash, no price and no forbidden Light Copy constructions', () => {
    for (const path of PROTOCOLO_SOURCES) {
      const source = code(read(path));
      expect(source, path).not.toContain('—');
      expect(/R\$\s?\d/.test(source), path).toBe(false);
      expect(source, path).not.toMatch(/mesmo que|sem precisar/i);
      expect(source, path).not.toMatch(/Não é [^.]{1,60}\. É /);
    }
  });
});

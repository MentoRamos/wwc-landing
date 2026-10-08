import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readInterest } from '@/lib/core/interest.core';
import { BOAS_VINDAS_SOURCE, DESAFIO, GUIAS } from '@/lib/boas-vindas';
import { commentMask } from './helpers/source';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
function code(source: string): string {
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

describe('/boas-vindas', () => {
  it('is never indexed and never listed in the sitemap', () => {
    expect(read('app/(site)/boas-vindas/page.tsx')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    expect(read('app/sitemap.ts')).not.toContain('boas-vindas');
  });

  it('ships the video and NIVA placeholders as empty constants', () => {
    const lib = read('lib/boas-vindas.ts');
    expect(lib).toMatch(/WELCOME_VIDEO_ID = ''/);
    expect(lib).toMatch(/NIVA_OFFER_URL = ''/);
  });

  it('lists six guides with distinct PDFs on kauaramos.com', () => {
    expect(GUIAS).toHaveLength(6);
    expect(new Set(GUIAS.map((g) => g.href)).size).toBe(6);
    for (const g of GUIAS) expect(g.href).toMatch(/^https:\/\/kauaramos\.com\/materiais\/[a-z0-9-]+\.pdf$/);
  });

  it('covers day 0, three weeks and day 21', () => {
    expect(DESAFIO.etapas).toHaveLength(5);
  });

  it('the guide form posts a lead the interest endpoint accepts, tagged with its origin', () => {
    expect(code(read('components/boas-vindas/GuidesGate.tsx'))).toContain('/api/interesse');
    const lead = readInterest({
      name: 'Teste',
      email: 'teste@example.com',
      product: 'circle',
      source: BOAS_VINDAS_SOURCE,
    });
    expect(lead?.source).toBe('boas-vindas-circle');
  });
});

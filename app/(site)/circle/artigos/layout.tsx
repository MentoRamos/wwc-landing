import { ReadingThemeSync, THEME_BOOT } from '@/components/articles/ReadingTheme';

/**
 * O que vale para todas as páginas de artigo: o modo leitura.
 *
 * O script vem antes do conteúdo para rodar durante o parse, antes da pintura
 * do artigo. Sem `loading.tsx` aqui, de propósito: este layout fica acima do
 * `[slug]`, e streaming acima dele faria o 404 de artigo inexistente sair 200
 * (ver tests/no-streaming-above-404.test.ts).
 */
export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <ReadingThemeSync />
      {children}
    </>
  );
}

import { coverSrc, resolveCover } from '@/lib/articles/covers';

type Source = { slug: string; topic: string | null; cover_key: string | null };

/**
 * `<img>` com os dois WebP já prontos, e não `next/image`: as capas saem do
 * nosso próprio banco em dois tamanhos, então o otimizador da Vercel não teria
 * nada a acrescentar além de cota gasta. Largura e altura explícitas reservam o
 * espaço e a página não pula quando a imagem chega.
 */
export function CoverImage({
  article,
  sizes,
  priority = false,
  className = '',
}: {
  article: Source;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const cover = resolveCover(article);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverSrc(cover.id, 1600)}
      srcSet={`${coverSrc(cover.id, 800)} 800w, ${coverSrc(cover.id, 1600)} 1600w`}
      sizes={sizes}
      width={1600}
      height={900}
      alt={cover.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

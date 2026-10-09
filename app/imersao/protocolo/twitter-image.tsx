/**
 * Twitter usa uma convenção de arquivo separada da do Open Graph
 * (`twitter-image` != `opengraph-image`), então sem este arquivo o card do
 * Twitter/X fica com `card: summary_large_image` mas sem imagem própria.
 * O cartão é o mesmo dos dois lados: reexporta a mesma imagem gerada pelo
 * `opengraph-image.tsx` desta pasta, em vez de duplicar fonte, foto e
 * layout num segundo arquivo.
 */
export { default, alt, size, contentType } from './opengraph-image';

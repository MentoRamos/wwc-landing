import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { articleHeadings } from '@/lib/core/speech.core';

/**
 * O markdown do artigo, com uma lista curta do que pode virar HTML.
 *
 * O texto vem de um modelo, e quem lê é qualquer um. `react-markdown` não
 * interpreta HTML cru por padrão; a lista de elementos permitidos fecha o
 * resto: imagem (que carregaria de qualquer host), tabela, título h1 (que já
 * é o título da página) e código não aparecem, e o que estiver dentro deles
 * vira texto comum em vez de sumir.
 */
const ALLOWED = ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'hr', 'br'];

const components: Components = {
  a: ({ href, children }) => {
    const safe = typeof href === 'string' && /^https:\/\//i.test(href) ? href : undefined;
    if (!safe) return <>{children}</>;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

export function ArticleBody({ markdown }: { markdown: string }) {
  // Cada `##` ganha a âncora que o sumário lateral usa. O render é em ordem de
  // documento, então o n-ésimo h2 recebe o n-ésimo id, repetidos inclusive.
  const ids = articleHeadings(markdown).map((heading) => heading.id);
  let next = 0;
  const withAnchors: Components = {
    ...components,
    h2: ({ children }) => <h2 id={ids[next++]}>{children}</h2>,
  };

  return (
    <div className="article-prose">
      <Markdown allowedElements={ALLOWED} unwrapDisallowed skipHtml components={withAnchors}>
        {markdown}
      </Markdown>
    </div>
  );
}

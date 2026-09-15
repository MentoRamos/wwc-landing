import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

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
  return (
    <div className="article-prose">
      <Markdown allowedElements={ALLOWED} unwrapDisallowed skipHtml components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}

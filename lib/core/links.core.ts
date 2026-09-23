/**
 * Este destino é uma rota, ou só um endereço?
 *
 * `next/link` faz prefetch do que entra na viewport, e isso é a feature certa
 * para uma página e o defeito errado para um endpoint com efeito. O download
 * do aluno grava `document_access_log` e assina uma URL do bucket dentro do
 * próprio GET: com um `Link` em cima dele, abrir a lista registraria leituras
 * que ninguém fez, na única trilha que existe justamente para dizer quem leu
 * o quê, e queimaria uma URL assinada por cartão visível.
 *
 * `Card` e `Button` decidiam isso cada um do seu jeito, e os dois decidiam
 * pela mesma pergunta errada: "começa com barra". Uma rota de API começa com
 * barra. A pergunta certa é se o destino é uma rota da navegação do Next, e
 * ela mora aqui, numa função, em vez de morar na cabeça de quem escreve a
 * próxima tela.
 */
export function isRouteLink(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('/api/');
}

/**
 * Sai do site, então abre fora dele.
 *
 * Separado de `isRouteLink` de propósito: um download nosso não é uma rota de
 * navegação e mesmo assim não é outro site, então ele não ganha
 * `target="_blank"` nem o `rel` que vem junto.
 */
export function isExternalLink(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('/');
}

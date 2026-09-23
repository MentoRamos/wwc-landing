/**
 * As rotas que existem em kauaramos.com mas NÃO moram aqui.
 *
 * O domínio é um só e são dois projetos: o funil estático atende o apex e
 * encaminha por rewrite os caminhos da plataforma. Então um link para
 * `/mentoria` é link válido na navegação daqui, e ao mesmo tempo é uma rota
 * que `app/` nunca vai conter.
 *
 * Sem esta lista, a guarda de links só teria duas opções ruins: reprovar link
 * legítimo, ou aceitar `/mentorias` escrito com um `s` a mais — que é
 * exatamente o erro que ninguém vê, porque quem escreve o link não clica nele.
 *
 * ⚠️ Estes caminhos só resolvem pelo domínio. Abrindo o deployment da Vercel
 * direto, eles dão 404, e está certo assim: o endereço canônico é
 * kauaramos.com e é por ele que qualquer pessoa chega.
 */
export const FUNNEL_ROUTES = [
  '/',
  '/wealth-wellness',
  '/mentoria',
  '/face-a-face',
  '/materiais',
  '/niva',
] as const;

-- A capa de cada artigo do Circle.
--
-- As imagens moram no repositório (public/artigos/capas) e o catálogo em
-- lib/articles/covers.ts; aqui fica só a escolha: qual capa este artigo usa.
-- O endpoint preenche quando a coluna está vazia, e o reenvio do cron não
-- troca. O admin troca pelo /admin/artigos.
--
-- Sem foreign key: o catálogo é código, não tabela. Um id que sumir do
-- catálogo é resolvido na renderização (cai na escolha automática pelo tema),
-- em vez de a página quebrar.

alter table public.articles
  add column cover_key text check (cover_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(cover_key) <= 80);

-- O admin já tinha `update (hidden_at)`. Ganha a capa, e só ela: texto continua
-- entrando apenas pelo endpoint, que valida.
grant update (cover_key) on public.articles to authenticated;

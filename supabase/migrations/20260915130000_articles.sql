-- Os artigos do W&W Circle.
--
-- Um cron no servidor (OpenClaw, 10h) pesquisa um tema de saúde e performance
-- em fonte primária e publica o resultado aqui, sem revisão humana antes de
-- ir ao ar. Duas coisas decorrem disso e moldam a tabela inteira:
--
-- 1. É a PRIMEIRA tabela desta plataforma que `anon` lê. Tudo o mais nega o
--    estranho por padrão. A exceção é deliberada (os artigos são públicos,
--    decisão do Kauã em 15/09) e por isso o contorno dela está escrito aqui
--    por extenso: o estranho lê o que foi publicado, e mais nada.
--
-- 2. O Kauã precisa conseguir tirar um artigo do ar com um clique, e o cron
--    não pode desfazer isso. Por isso "escondido" é uma coluna própria
--    (`hidden_at`) em vez de `published_at = null`: o endpoint de ingestão faz
--    upsert por slug e nunca escreve `hidden_at`, então reenviar um artigo que
--    foi escondido atualiza o texto e o mantém fora do ar. E a data que o
--    leitor vê sobrevive a esconder e republicar.

create table public.articles (
  id            uuid primary key default extensions.gen_random_uuid(),
  slug          text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  title         text not null check (length(title) between 1 and 140),
  dek           text not null check (length(dek) between 1 and 300),
  body_md       text not null check (length(body_md) between 1 and 40000),
  -- [{label, url}]. A forma dos itens é validada na aplicação
  -- (articles.core); o banco garante só que é uma lista, que é o que o
  -- renderizador assume ao iterar.
  sources       jsonb not null default '[]'::jsonb
                check (jsonb_typeof(sources) = 'array'),
  topic         text check (length(topic) <= 40),
  -- A pasta do kit no servidor que originou o artigo. Rastreabilidade: quando
  -- alguém contestar um número, a pesquisa checada fonte por fonte está lá.
  source_kit    text check (length(source_kit) <= 120),
  published_at  timestamptz not null default now(),
  hidden_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- A listagem pública ordena por data e filtra os visíveis.
create index articles_public_idx on public.articles (published_at desc)
  where hidden_at is null;

alter table public.articles enable row level security;

-- O que o público vê. `now()` dentro da política faz um artigo agendado
-- aparecer sozinho na hora certa, sem cron nenhum para "liberar".
create policy articles_public_read on public.articles
  for select
  to anon, authenticated
  using (hidden_at is null and published_at <= now());

-- O admin vê tudo, inclusive o escondido, para poder republicar.
create policy articles_admin_read on public.articles
  for select
  to authenticated
  using (public.is_admin());

-- Esconder e republicar pelo /admin/artigos, com o cliente do próprio admin.
-- A Server Action confere o admin também, mas o portão é este.
create policy articles_admin_write on public.articles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- O admin só esconde e republica: o grant é da coluna `hidden_at`, e nada de
-- insert ou delete. O texto só entra pelo endpoint, que valida (travessão,
-- HTML, fontes https). Sem isto, um JWT de admin roubado reescreveria um
-- artigo público direto pelo PostgREST, por fora de toda validação.
revoke all on public.articles from anon;
revoke all on public.articles from authenticated;
grant select on public.articles to anon;
grant select on public.articles to authenticated;
grant update (hidden_at) on public.articles to authenticated;
-- O endpoint de ingestão escreve como servidor. Explícito pela mesma razão da
-- 20260911120000: o projeto hospedado não concede nada sozinho.
grant all on public.articles to service_role;

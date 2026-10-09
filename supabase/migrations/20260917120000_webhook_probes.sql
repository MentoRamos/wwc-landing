-- A sonda do webhook: o que chegou e não passou pela porta.
--
-- A Kiwify não documenta como assina. O código agora reconhece as formas
-- plausíveis (HMAC sha1, HMAC sha256, token repetido) em vez de escolher uma
-- por variável de ambiente, mas "reconhece as plausíveis" não é o mesmo que
-- "reconhece todas": se ela assinar algo que não é o corpo cru, nenhuma casa.
--
-- Sem esta tabela, esse caso é um 400 mudo no dia da primeira venda. Com ela,
-- o mesmo 400 deixa para trás o suficiente para consertar em um deploy: o que
-- veio no corpo, que nomes de assinatura vieram junto, e de onde.
--
-- É diagnóstico, não registro contábil. `billing_events` continua sendo o
-- livro do que virou acesso; aqui só entra o que foi RECUSADO.
create table public.webhook_probes (
  id            uuid primary key default gen_random_uuid(),

  provider      text not null,
  reason        text not null,

  -- Os nomes de onde uma assinatura poderia vir (`query:signature`,
  -- `header:x-kiwify-token`), e o valor que de fato chegou. O valor é um
  -- digest ou um token do provedor, não dado de pessoa.
  sources       text[] not null default '{}',
  signature_seen text,

  -- O corpo cru, truncado. Ele carrega nome, e-mail e documento de quem
  -- comprou, então a tabela é só do admin e a linha é descartável: depois que
  -- a assinatura estiver entendida, `delete from public.webhook_probes` e a
  -- dívida some. Truncar limita o estrago de alguém despejar lixo aqui.
  body          text,
  body_bytes    integer,

  received_at   timestamptz not null default now()
);

create index webhook_probes_recent_idx on public.webhook_probes (provider, received_at desc);

alter table public.webhook_probes enable row level security;

revoke all on public.webhook_probes from anon;
revoke all on public.webhook_probes from authenticated;

-- Só o admin lê. Ninguém além do service role escreve: quem posta no webhook
-- não está autenticado, e é justamente o conteúdo dele que mora aqui.
grant select on public.webhook_probes to authenticated;
create policy webhook_probes_read_admin on public.webhook_probes
  for select to authenticated
  using (public.is_admin());

-- O grant que o Supabase local concede sozinho e a produção não: sem isto, a
-- sonda falha em silêncio exatamente no evento que ela existe para explicar.
grant all on public.webhook_probes to service_role;

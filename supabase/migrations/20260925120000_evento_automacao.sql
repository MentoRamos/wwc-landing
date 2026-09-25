-- Automação do pós-compra e do aquecimento da Imersão (Marco 1).
--
-- Fonte: `Automação - Pós-compra e aquecimento (design v1, 24 set 2026).md`,
-- seção 3.2, com os acréscimos que os Marcos 1 e 2 pediram:
--   * `bought_recording_at` e `protocol_deposit_at` no comprador (a gravação
--     de R$ 67 e a reserva de R$ 1.000 criadas na Kiwify em 24/09);
--   * as funções `evento_register_buyer`, `evento_cancel_buyer` e
--     `evento_mark_purchase`, para o webhook fazer cada efeito numa transação
--     só em vez de uma sequência de chamadas que pode parar no meio;
--   * o bucket privado `evento`, onde mora a Ficha da Hora Fixa;
--   * (Marco 2) o claim do WhatsApp com as regras de envio, e as funções
--     `evento_wa_result` e `evento_wa_optout` para o worker.
--
-- Três tabelas carregam a operação (comprador, fila, saída) e duas guardam o
-- que a pessoa escreveu (pesquisa, aplicação). Nenhuma é legível por anon, e
-- só o service role escreve: as páginas públicas gravam por server action,
-- depois do zod, igual a `interest`.
--
-- NÃO APLICAR sem revisão (regra do repo). Nada aqui roda sozinho: o relógio
-- (`pg_cron`) e a retenção ficam para uma migration separada, no Marco 3.

-- ------------------------------------------------------------ a edição
insert into public.event_editions (slug, title, starts_at, status)
values ('imersao-2026-10', 'Imersão Performance e Longevidade',
        '2026-10-28 19:30:00-03', 'open')
on conflict (slug) do nothing;

-- ------------------------------------------------------------ comprador
create table public.event_buyers (
  id                  uuid primary key default gen_random_uuid(),
  edition_id          uuid not null references public.event_editions(id),
  order_id            text not null,                 -- Kiwify order_id
  email_norm          text not null check (email_norm = public.norm_email(email_norm)),
  first_name          text,
  phone_e164          text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  wa_jid              text,                          -- resolvido pela Evolution (nono dígito)
  purchased_at        timestamptz not null,
  status              text not null default 'paid'
                        check (status in ('paid', 'refunded', 'chargeback')),
  -- Quem comprou antes de a gravação sair do ingresso mantém a gravação.
  -- Calculado no insert a partir de purchased_at < corte; coluna, e não
  -- conta na hora, porque o corte é decisão comercial e não pode mudar
  -- retroativamente se alguém editar uma constante.
  includes_recording  boolean not null default false,
  bought_protocol_at  timestamptz,
  bought_recording_at timestamptz,                   -- gravação avulsa (R$ 67)
  protocol_deposit_at timestamptz,                   -- reserva do Protocol (R$ 1.000)
  source              text not null default 'webhook'
                        check (source in ('webhook', 'backfill', 'sandbox')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  anonymized_at       timestamptz,
  unique (edition_id, order_id)
);
create index event_buyers_email_idx on public.event_buyers (edition_id, email_norm);

create trigger event_buyers_set_updated_at
  before update on public.event_buyers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ a fila (outbox)
create table public.message_jobs (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.event_buyers(id) on delete cascade,
  channel     text not null check (channel in ('email', 'whatsapp')),
  step_key    text not null,                        -- texto livre, como circle_emails
  due_at      timestamptz not null,
  status      text not null default 'pending'
                check (status in ('pending', 'claimed', 'sent', 'failed',
                                  'canceled', 'skipped', 'blocked', 'unknown')),
  attempts    smallint not null default 0,
  claimed_at  timestamptz,
  lease_until timestamptz,
  provider_id text,                                 -- id do Resend / da mensagem na Evolution
  error       text,                                 -- motivo curto, nunca corpo nem endereço
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (buyer_id, channel, step_key)              -- a idempotência é do banco
);
create index message_jobs_due_idx on public.message_jobs (channel, status, due_at);

-- ------------------------------------------------------------ saída
create table public.contact_optouts (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('email', 'whatsapp')),
  -- e-mail normalizado ou telefone E.164; um dos dois, conforme o canal
  address    text not null,
  scope      text not null default 'evento' check (scope in ('evento', 'all')),
  source     text not null check (source in ('sair', 'link', 'admin', 'bounce', 'complaint')),
  created_at timestamptz not null default now(),
  unique (channel, address, scope)
);

-- ------------------------------------------------------------ pesquisa
create table public.survey_responses (
  id              uuid primary key default gen_random_uuid(),
  edition_id      uuid not null references public.event_editions(id),
  buyer_id        uuid references public.event_buyers(id) on delete set null,
  email_norm      text not null check (email_norm = public.norm_email(email_norm)),
  origin          text not null check (origin in ('t0', 'grupo', 'antigos', 'email')),
  answers         jsonb not null,                   -- validado por zod antes
  consent_version text not null,
  consent_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (edition_id, email_norm)                   -- 2º envio atualiza o 1º
);

create trigger survey_responses_set_updated_at
  before update on public.survey_responses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ aplicação (45 do 2º tempo)
create table public.protocol_applications (
  id              uuid primary key default gen_random_uuid(),
  edition_id      uuid not null references public.event_editions(id),
  buyer_id        uuid references public.event_buyers(id) on delete set null,
  email_norm      text not null check (email_norm = public.norm_email(email_norm)),
  name            text not null,
  whatsapp        text not null,
  answers         jsonb not null,
  submitted_at    timestamptz not null default now(),  -- relógio do servidor decide o 22h15
  within_deadline boolean not null,
  status          text not null default 'new'
                    check (status in ('new', 'contacted', 'deposit_paid', 'closed', 'lost')),
  consent_at      timestamptz not null,
  unique (edition_id, email_norm)
);

-- ------------------------------------------------------------ RLS e grants
alter table public.event_buyers          enable row level security;
alter table public.message_jobs          enable row level security;
alter table public.contact_optouts       enable row level security;
alter table public.survey_responses      enable row level security;
alter table public.protocol_applications enable row level security;

-- Molde de `interest` (20260911210000): tira TUDO de anon e authenticated.
-- O default do Supabase também dá truncate, references e trigger, que um
-- `revoke insert, update, delete` deixaria para trás. Depois devolve só o
-- select (a política abaixo restringe ao admin) e tudo ao service role.
revoke all on public.event_buyers, public.message_jobs, public.contact_optouts,
              public.survey_responses, public.protocol_applications from anon, authenticated;
grant select on public.event_buyers, public.message_jobs, public.contact_optouts,
                public.survey_responses, public.protocol_applications to authenticated;
grant all on public.event_buyers, public.message_jobs, public.contact_optouts,
             public.survey_responses, public.protocol_applications to service_role;

-- Só o admin lê. Membro não tem por que consultar a fila de ninguém, nem a
-- própria, e escrita é sempre do service role, depois da validação.
create policy event_buyers_admin_read on public.event_buyers
  for select to authenticated using (public.is_admin());
create policy message_jobs_admin_read on public.message_jobs
  for select to authenticated using (public.is_admin());
create policy contact_optouts_admin_read on public.contact_optouts
  for select to authenticated using (public.is_admin());
create policy survey_responses_admin_read on public.survey_responses
  for select to authenticated using (public.is_admin());
create policy protocol_applications_admin_read on public.protocol_applications
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------ o claim do WhatsApp
-- O worker do ww-evolution-01 chama `/api/wa/claim`, que chama isto. Uma
-- chamada, uma transação: pega os vencidos, trava com skip locked e já marca
-- 'claimed' com lease de 10 minutos.
--
-- O que é decidido aqui, e não em TypeScript, é o que não pode ter corrida
-- nem depender de quem chamou lembrar:
--   * comprador pago e sem SAIR no momento do claim;
--   * lease vencido vira 'unknown', no máximo uma vez, nunca 'pending': no
--     WhatsApp não há chave de idempotência, e o job pode ter saído (o
--     e-mail é o contrário: lá o lease vencido volta para a fila);
--   * 20 s entre claims (o +1 não manda rajada), teto de 24h
--     (`p_daily_cap`), no máximo 4 mensagens por comprador, um passo por vez
--     e na ordem, e 15 min entre passos que não são a T0 do mesmo comprador
--     (depois do silêncio ou de uma queda do worker, a manhã não vira
--     rajada para a mesma pessoa);
--   * comprador real só com `p_real_buyers` (site e worker em live); os de
--     teste (`source = 'sandbox'`) sempre; os do backfill só com
--     `p_antigos` (o envio aos antigos depende de OK do Kauã).
-- O que muda com configuração (silêncio, links, kill switch) chega pronto
-- em `p_steps`, calculado e testado em `lib/core/evento-wa.core.ts`.
--
-- `p_dry_run`: devolve o que sairia e não escreve nada. O worker em dry-run
-- não reporta resultado, então um lease criado ali viraria 'unknown'.
--
-- Sem `security definer`, como as outras funções: só o service role executa
-- (grant abaixo), e ele já tem BYPASSRLS e grant nas tabelas. Definer não
-- acrescentaria nada, e transformaria qualquer grant de execute errado no
-- futuro em acesso à fila inteira. O `search_path` termina em `pg_temp` para
-- que um objeto temporário nunca sombreie um de `public`.
create or replace function public.claim_wa_jobs(
  p_limit       int,
  p_now         timestamptz,
  p_steps       text[],
  p_real_buyers boolean,
  p_antigos     boolean,
  p_daily_cap   int,
  p_dry_run     boolean
)
returns table (job_id uuid, buyer_id uuid, step_key text, phone_e164 text,
               first_name text, purchased_at timestamptz, source text)
language plpgsql
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_room int;
  v_ids  uuid[];
begin
  if coalesce(p_limit, 0) < 1 or coalesce(array_length(p_steps, 1), 0) = 0 then
    return;
  end if;

  if not p_dry_run then
    -- Um claim por vez: o intervalo e o teto abaixo leem o que o claim
    -- anterior escreveu.
    perform pg_advisory_xact_lock(hashtext('public.claim_wa_jobs'));

    update public.message_jobs
       set status = 'unknown', error = 'lease-vencido', lease_until = null
     where channel = 'whatsapp' and status = 'claimed' and lease_until < p_now;

    -- Estados que não se resolvem esperando saem da fila com o motivo, em
    -- vez de ficarem pendentes para sempre no painel.
    update public.message_jobs j
       set status = 'skipped', error = 'gravacao-comprada'
      from public.event_buyers b
     where b.id = j.buyer_id and j.channel = 'whatsapp' and j.status = 'pending'
       and j.step_key = 'gravacao_oferta' and b.bought_recording_at is not null;
    update public.message_jobs j
       set status = 'skipped', error = 'sem-telefone'
      from public.event_buyers b
     where b.id = j.buyer_id and j.channel = 'whatsapp' and j.status = 'pending'
       and b.status = 'paid' and b.phone_e164 is null;

    if exists (select 1 from public.message_jobs
                where channel = 'whatsapp' and claimed_at > p_now - interval '20 seconds') then
      return;
    end if;
  end if;

  select greatest(0, coalesce(p_daily_cap, 0) - count(*))::int into v_room
    from public.message_jobs
   where channel = 'whatsapp' and status in ('claimed', 'sent', 'unknown')
     and claimed_at > p_now - interval '24 hours';

  select array_agg(x.id) into v_ids from (
    select j2.id
      from public.message_jobs j2
      join public.event_buyers b on b.id = j2.buyer_id
     where j2.channel = 'whatsapp'
       and j2.status = 'pending'
       and j2.due_at <= p_now
       and j2.step_key = any(p_steps)
       and b.status = 'paid'
       and b.phone_e164 is not null
       and (p_real_buyers or b.source = 'sandbox')
       and (p_antigos or b.source <> 'backfill')
       and not (j2.step_key = 'gravacao_oferta' and b.bought_recording_at is not null)
       and not exists (select 1 from public.contact_optouts o
                        where o.channel = 'whatsapp' and o.address = b.phone_e164)
       and (select count(*) from public.message_jobs s
             where s.buyer_id = j2.buyer_id and s.channel = 'whatsapp'
               and s.status in ('claimed', 'sent', 'unknown')) < 4
       and not exists (select 1 from public.message_jobs e
                        where e.buyer_id = j2.buyer_id and e.channel = 'whatsapp'
                          and e.id <> j2.id and e.step_key = any(p_steps)
                          and e.status in ('pending', 'claimed')
                          and (e.due_at, e.id) < (j2.due_at, j2.id))
       and (j2.step_key = 't0'
            or not exists (select 1 from public.message_jobs g
                            where g.buyer_id = j2.buyer_id and g.channel = 'whatsapp'
                              and g.step_key <> 't0'
                              and g.claimed_at > p_now - interval '15 minutes'))
     order by j2.due_at, j2.id
     limit least(p_limit, v_room)
       for update of j2 skip locked
  ) x;

  if v_ids is null then
    return;
  end if;

  if p_dry_run then
    return query
      select j.id, j.buyer_id, j.step_key, b.phone_e164, b.first_name, b.purchased_at, b.source
        from public.message_jobs j join public.event_buyers b on b.id = j.buyer_id
       where j.id = any(v_ids)
       order by j.due_at, j.id;
    return;
  end if;

  update public.message_jobs j
     set status = 'claimed', claimed_at = p_now, lease_until = p_now + interval '10 minutes',
         attempts = j.attempts + 1, error = null
   where j.id = any(v_ids);

  return query
    select j.id, j.buyer_id, j.step_key, b.phone_e164, b.first_name, b.purchased_at, b.source
      from public.message_jobs j join public.event_buyers b on b.id = j.buyer_id
     where j.id = any(v_ids)
     order by j.due_at, j.id;
end;
$$;
revoke all on function public.claim_wa_jobs(int, timestamptz, text[], boolean, boolean, int, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_wa_jobs(int, timestamptz, text[], boolean, boolean, int, boolean)
  to service_role;

-- ------------------------------------------------------------ o resultado do WhatsApp
-- O worker reporta o que aconteceu com um job que ele reservou. Idempotente:
-- só um job 'claimed' (ou 'unknown', cujo lease venceu antes do relato)
-- muda; qualquer outro devolve 'noop'. `sent` guarda o id da mensagem e o
-- JID resolvido pela Evolution; `no_whatsapp` encerra os outros passos de
-- WhatsApp daquele comprador (o número não tem WhatsApp, o e-mail cobre);
-- `failed` e `skipped` guardam só o motivo curto, nunca corpo nem endereço.
create or replace function public.evento_wa_result(
  p_job        uuid,
  p_status     text,
  p_reason     text,
  p_jid        text,
  p_message_id text,
  p_now        timestamptz
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_buyer uuid;
begin
  if p_status not in ('sent', 'failed', 'no_whatsapp', 'skipped') then
    raise exception 'status inválido: %', p_status;
  end if;

  update public.message_jobs
     set status      = case p_status when 'sent' then 'sent' when 'failed' then 'failed' else 'skipped' end,
         error       = case p_status when 'sent' then null when 'no_whatsapp' then 'no_whatsapp'
                                     else coalesce(p_reason, p_status) end,
         provider_id = case when p_status = 'sent' then p_message_id else provider_id end,
         sent_at     = case when p_status = 'sent' then p_now else sent_at end,
         lease_until = null
   where id = p_job and channel = 'whatsapp' and status in ('claimed', 'unknown')
  returning buyer_id into v_buyer;

  if v_buyer is null then
    if exists (select 1 from public.message_jobs where id = p_job and channel = 'whatsapp') then
      return 'noop';
    end if;
    return 'not_found';
  end if;

  if p_status = 'sent' and p_jid is not null then
    update public.event_buyers set wa_jid = p_jid where id = v_buyer;
  elsif p_status = 'no_whatsapp' then
    update public.message_jobs
       set status = 'skipped', error = 'no_whatsapp'
     where buyer_id = v_buyer and channel = 'whatsapp' and status = 'pending';
  end if;

  return 'updated';
end;
$$;
revoke all on function public.evento_wa_result(uuid, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.evento_wa_result(uuid, text, text, text, text, timestamptz)
  to service_role;

-- ------------------------------------------------------------ SAIR no WhatsApp
-- `p_addresses`: o número que respondeu SAIR, nas formas E.164 que ele pode
-- ter (com e sem o nono dígito; o site calcula). Acha os compradores pelo
-- telefone ou pelo JID que a Evolution resolveu, grava a saída para cada
-- endereço e para o telefone de cada comprador achado, e cancela os jobs de
-- WhatsApp pendentes deles. O e-mail segue (outro canal, outra saída).
-- Repetir não quebra: a saída é `on conflict do nothing` e não há mais
-- pendente para cancelar. Devolve quantos jobs foram cancelados.
create or replace function public.evento_wa_optout(p_addresses text[])
returns int
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_buyers uuid[];
  v_count  int := 0;
begin
  select array_agg(b.id) into v_buyers
    from public.event_buyers b
   where b.phone_e164 = any(p_addresses)
      or b.wa_jid = any(select ltrim(a, '+') || '@s.whatsapp.net' from unnest(p_addresses) a);

  insert into public.contact_optouts (channel, address, scope, source)
  select 'whatsapp', a, 'evento', 'sair'
    from (select unnest(p_addresses) as a
          union
          select b.phone_e164 from public.event_buyers b
           where b.id = any(coalesce(v_buyers, '{}')) and b.phone_e164 is not null) addresses
   where a ~ '^\+[1-9][0-9]{7,14}$'
  on conflict (channel, address, scope) do nothing;

  update public.message_jobs
     set status = 'canceled', error = 'sair'
   where buyer_id = any(coalesce(v_buyers, '{}')) and channel = 'whatsapp' and status = 'pending';
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;
revoke all on function public.evento_wa_optout(text[]) from public, anon, authenticated;
grant execute on function public.evento_wa_optout(text[]) to service_role;

-- ------------------------------------------------------------ registrar comprador
-- O webhook chama isto depois de ganhar a trava de `billing_events`. Numa
-- transação: cria o comprador (ou acha o que já existe pelo order_id) e
-- enfileira os jobs que o núcleo em TypeScript calculou (`p_jobs`, um array
-- de {channel, step_key, due_at}). Reentrega é inofensiva nas duas pontas:
-- `unique (edition_id, order_id)` e `unique (buyer_id, channel, step_key)`.
--
-- Comprador que já não está 'paid' (o reembolso chegou antes da aprovação e
-- deixou uma lápide) não ganha job nenhum.
--
-- Devolve o id do job da T0 por e-mail, se ele estiver pendente, para o
-- webhook enviá-la no `after()`.
create or replace function public.evento_register_buyer(
  p_order_id           text,
  p_email              text,
  p_first_name         text,
  p_phone              text,
  p_purchased_at       timestamptz,
  p_includes_recording boolean,
  p_source             text,
  p_jobs               jsonb
)
returns table (buyer_id uuid, created boolean, t0_email_job_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_edition uuid;
  v_buyer   uuid;
  v_status  text;
  v_source  text;
  v_created boolean := false;
begin
  select id into v_edition from public.event_editions where slug = 'imersao-2026-10';
  if v_edition is null then
    raise exception 'edição imersao-2026-10 ausente';
  end if;

  insert into public.event_buyers
    (edition_id, order_id, email_norm, first_name, phone_e164,
     purchased_at, includes_recording, source)
  values
    (v_edition, p_order_id, public.norm_email(p_email), nullif(btrim(p_first_name), ''),
     p_phone, p_purchased_at, p_includes_recording, p_source)
  on conflict (edition_id, order_id) do nothing
  returning id, status, source into v_buyer, v_status, v_source;

  if v_buyer is null then
    select b.id, b.status, b.source into v_buyer, v_status, v_source
      from public.event_buyers b
     where b.edition_id = v_edition and b.order_id = p_order_id;
  else
    v_created := true;
  end if;

  -- Jobs só da mesma origem que criou o comprador. O backfill relê pedidos
  -- que o webhook já registrou; sem esta trava ele somaria a `t0_antigos`
  -- (passo novo, fora da chave única) a quem já recebeu a `t0`.
  if v_status = 'paid' and (v_created or v_source = p_source) then
    insert into public.message_jobs (buyer_id, channel, step_key, due_at)
    select v_buyer, j.channel, j.step_key, j.due_at
      from jsonb_to_recordset(coalesce(p_jobs, '[]'::jsonb))
           as j(channel text, step_key text, due_at timestamptz)
    on conflict on constraint message_jobs_buyer_id_channel_step_key_key do nothing;
  end if;

  return query
    select v_buyer, v_created,
           (select m.id from public.message_jobs m
             where m.buyer_id = v_buyer and m.channel = 'email'
               and m.step_key = 't0' and m.status = 'pending');
end;
$$;
revoke all on function public.evento_register_buyer(text, text, text, text, timestamptz, boolean, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.evento_register_buyer(text, text, text, text, timestamptz, boolean, text, jsonb)
  to service_role;

-- ------------------------------------------------------------ reembolso e chargeback
-- A Kiwify não documenta se o reembolso repete o order_id da aprovação.
-- Cobrimos os dois casos, nesta ordem:
--   1. mesmo order_id: o comprador daquele pedido;
--   2. outro order_id: o único comprador 'paid' com aquele e-mail na edição
--      (com dois ou mais, não dá para saber qual pedido foi desfeito, e
--      nenhum é tocado: `matched_by = 'ambiguous'`, e o webhook avisa);
--   3. ninguém: uma lápide com o order_id e o status, para que uma aprovação
--      que chegue DEPOIS do reembolso (entrega fora de ordem) não crie um
--      comprador pago nem enfileire mensagem de venda. Se a aprovação do
--      mesmo pedido entrar no meio (concorrência), a lápide cede
--      (`on conflict do nothing`) e o reembolso segue pelo caso 1.
-- Os jobs pendentes viram 'canceled'. Os que já estão 'claimed' seguem: o
-- claim do WhatsApp reconfere `status = 'paid'`, e o envio de e-mail também.
create or replace function public.evento_cancel_buyer(
  p_order_id text,
  p_email    text,
  p_status   text
)
returns table (buyer_id uuid, canceled_jobs int, matched_by text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_edition  uuid;
  v_buyer    uuid;
  v_matched  text;
  v_count    int := 0;
  v_canceled int := 0;
begin
  if p_status not in ('refunded', 'chargeback') then
    raise exception 'status inválido: %', p_status;
  end if;

  select id into v_edition from public.event_editions where slug = 'imersao-2026-10';
  if v_edition is null then
    raise exception 'edição imersao-2026-10 ausente';
  end if;

  select b.id into v_buyer
    from public.event_buyers b
   where b.edition_id = v_edition and b.order_id = p_order_id;
  if v_buyer is not null then
    v_matched := 'order_id';
  else
    select count(*) into v_count
      from public.event_buyers b
     where b.edition_id = v_edition and b.email_norm = public.norm_email(p_email) and b.status = 'paid';
    if v_count = 1 then
      select b.id into v_buyer
        from public.event_buyers b
       where b.edition_id = v_edition and b.email_norm = public.norm_email(p_email) and b.status = 'paid';
      v_matched := 'email';
    elsif v_count > 1 then
      return query select null::uuid, 0, 'ambiguous'::text;
      return;
    end if;
  end if;

  if v_buyer is null then
    insert into public.event_buyers (edition_id, order_id, email_norm, purchased_at, status, source)
    values (v_edition, p_order_id, public.norm_email(p_email), now(), p_status, 'webhook')
    on conflict (edition_id, order_id) do nothing
    returning id into v_buyer;
    if v_buyer is not null then
      return query select v_buyer, 0, 'tombstone'::text;
      return;
    end if;
    -- A aprovação do mesmo pedido entrou entre o select acima e o insert
    -- (entregas concorrentes). O comprador agora existe: segue pelo caminho
    -- do order_id, marcando o status e cancelando o que ficou pendente.
    select b.id into v_buyer
      from public.event_buyers b
     where b.edition_id = v_edition and b.order_id = p_order_id;
    v_matched := 'order_id';
  end if;

  update public.event_buyers set status = p_status where id = v_buyer;

  update public.message_jobs
     set status = 'canceled', error = p_status
   where message_jobs.buyer_id = v_buyer and status = 'pending';
  get diagnostics v_canceled = row_count;

  return query select v_buyer, v_canceled, v_matched;
end;
$$;
revoke all on function public.evento_cancel_buyer(text, text, text) from public, anon, authenticated;
grant execute on function public.evento_cancel_buyer(text, text, text) to service_role;

-- ------------------------------------------------------------ gravação, reserva, Protocol
-- A compra que vem depois do ingresso marca o comprador pelo e-mail. Não
-- libera nada na plataforma (a gravação é entregue na área de membros da
-- Kiwify; o Protocol é onboarding manual). `coalesce` para a primeira data
-- ficar: uma segunda compra não reescreve quando a primeira aconteceu.
--
-- A reserva do Protocol também move a aplicação dos 45 do segundo tempo
-- para 'deposit_paid', se ela ainda estiver aberta.
--
-- Devolve quantos compradores foram marcados. Zero é legítimo (alguém
-- comprou o Protocol sem ter comprado o ingresso) e fica no resultado do
-- `billing_events`.
create or replace function public.evento_mark_purchase(
  p_email text,
  p_kind  text,
  p_at    timestamptz
)
returns int
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_edition uuid;
  v_count   int := 0;
  v_email   text := public.norm_email(p_email);
begin
  select id into v_edition from public.event_editions where slug = 'imersao-2026-10';
  if v_edition is null then
    raise exception 'edição imersao-2026-10 ausente';
  end if;

  if p_kind = 'protocol' then
    update public.event_buyers
       set bought_protocol_at = coalesce(bought_protocol_at, p_at)
     where edition_id = v_edition and email_norm = v_email;
  elsif p_kind = 'recording' then
    update public.event_buyers
       set bought_recording_at = coalesce(bought_recording_at, p_at)
     where edition_id = v_edition and email_norm = v_email;
  elsif p_kind = 'protocol_deposit' then
    update public.event_buyers
       set protocol_deposit_at = coalesce(protocol_deposit_at, p_at)
     where edition_id = v_edition and email_norm = v_email;
  else
    raise exception 'tipo inválido: %', p_kind;
  end if;
  get diagnostics v_count = row_count;

  if p_kind = 'protocol_deposit' then
    update public.protocol_applications
       set status = 'deposit_paid'
     where edition_id = v_edition and email_norm = v_email and status in ('new', 'contacted');
  end if;

  return v_count;
end;
$$;
revoke all on function public.evento_mark_purchase(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.evento_mark_purchase(text, text, timestamptz) to service_role;

-- ------------------------------------------------------------ a Ficha
-- Mesmo molde da biblioteca: bucket privado e NENHUMA política em
-- storage.objects. O único caminho até o arquivo é a URL assinada de 10
-- minutos que a server action da pesquisa gera com o service role, depois
-- de gravar as respostas. O upload do PDF (`ficha-hora-fixa.pdf`) é manual.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evento',
  'evento',
  false,                      -- nunca servido direto; só URL assinada
  10485760,                   -- 10 MiB: é uma ficha de uma ou duas páginas
  array['application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

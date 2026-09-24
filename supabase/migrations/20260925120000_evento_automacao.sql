-- Automação do pós-compra e do aquecimento da Imersão (Marco 1).
--
-- Fonte: `Automação - Pós-compra e aquecimento (design v1, 24 set 2026).md`,
-- seção 3.2, com três acréscimos que o Marco 1 pediu:
--   * `bought_recording_at` e `protocol_deposit_at` no comprador (a gravação
--     de R$ 67 e a reserva de R$ 1.000 criadas na Kiwify em 24/09);
--   * as funções `evento_register_buyer`, `evento_cancel_buyer` e
--     `evento_mark_purchase`, para o webhook fazer cada efeito numa transação
--     só em vez de uma sequência de chamadas que pode parar no meio;
--   * o bucket privado `evento`, onde mora a Ficha da Hora Fixa.
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

revoke all on public.event_buyers, public.message_jobs, public.contact_optouts,
              public.survey_responses, public.protocol_applications from anon;
grant select on public.event_buyers, public.message_jobs, public.contact_optouts,
                public.survey_responses, public.protocol_applications to authenticated;
revoke insert, update, delete on public.event_buyers, public.message_jobs,
              public.contact_optouts, public.survey_responses,
              public.protocol_applications from authenticated;
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
-- Uma chamada, uma transação: pega os vencidos, trava com skip locked (dois
-- workers ou dois ticks nunca pegam o mesmo job) e já marca 'claimed'.
-- As regras de silêncio/throttle ficam em TypeScript (testadas); esta função
-- só garante a exclusão mútua e as condições que não podem ter corrida:
-- comprador pago e sem SAIR NO MOMENTO do claim. Não é chamada no Marco 1
-- (o worker é do Marco 2), mas nasce aqui para o schema sair inteiro.
create or replace function public.claim_wa_jobs(p_limit int, p_now timestamptz)
returns setof public.message_jobs
language sql
security definer
set search_path = public
as $$
  update public.message_jobs j
     set status = 'claimed', claimed_at = p_now,
         lease_until = p_now + interval '10 minutes', attempts = j.attempts + 1
   where j.id in (
     select j2.id
       from public.message_jobs j2
       join public.event_buyers b on b.id = j2.buyer_id
      where j2.channel = 'whatsapp'
        and j2.status = 'pending'
        and j2.due_at <= p_now
        and b.status = 'paid'
        and b.phone_e164 is not null
        and not exists (select 1 from public.contact_optouts o
                         where o.channel = 'whatsapp' and o.address = b.phone_e164)
      order by j2.due_at
      limit p_limit
      for update of j2 skip locked)
  returning j.*;
$$;
revoke all on function public.claim_wa_jobs(int, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_wa_jobs(int, timestamptz) to service_role;

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
set search_path = public
as $$
declare
  v_edition uuid;
  v_buyer   uuid;
  v_status  text;
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
  returning id, status into v_buyer, v_status;

  if v_buyer is null then
    select b.id, b.status into v_buyer, v_status
      from public.event_buyers b
     where b.edition_id = v_edition and b.order_id = p_order_id;
  else
    v_created := true;
  end if;

  if v_status = 'paid' then
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
--      comprador pago nem enfileire mensagem de venda.
-- Os jobs pendentes viram 'canceled'. Os que já estão 'claimed' seguem: o
-- claim do WhatsApp reconfere `status = 'paid'`, e o envio de e-mail também.
create or replace function public.evento_cancel_buyer(
  p_order_id text,
  p_email    text,
  p_status   text
)
returns table (buyer_id uuid, canceled_jobs int, matched_by text)
language plpgsql
set search_path = public
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
    returning id into v_buyer;
    return query select v_buyer, 0, 'tombstone'::text;
    return;
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
set search_path = public
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

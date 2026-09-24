-- Rollback de `supabase/migrations/20260925120000_evento_automacao.sql`.
--
-- Mora FORA de `supabase/migrations/` de propósito: o CLI aplica tudo que
-- está lá, e este arquivo ali rodaria no próximo `db push`.
--
-- NÃO RODAR sem OK do Kauã. Apaga compradores, fila, opt-outs, pesquisa e
-- aplicações da imersão, sem volta: exportar antes o que precisar ficar
-- (`event_buyers`, `survey_responses`, `contact_optouts`). `billing_events`
-- não é tocado, então as vendas continuam registradas e dá para refazer os
-- compradores a partir dele (backfill do Marco 2).
--
-- Como rodar (produção, só com OK):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/rollback/20260925120000_evento_automacao.down.sql
--
-- O bucket `evento` só sai se estiver vazio: o Supabase não deixa apagar
-- objeto do Storage por SQL. Com a Ficha lá, apagar pelo painel (Storage →
-- evento) e rodar de novo, ou deixar o bucket (é privado e sem política).

begin;

drop function if exists public.claim_wa_jobs(int, timestamptz);
drop function if exists public.evento_register_buyer(text, text, text, text, timestamptz, boolean, text, jsonb);
drop function if exists public.evento_cancel_buyer(text, text, text);
drop function if exists public.evento_mark_purchase(text, text, timestamptz);

-- Filhas antes da mãe (message_jobs, survey_responses e protocol_applications
-- apontam para event_buyers). As políticas e os triggers caem com a tabela.
drop table if exists public.message_jobs;
drop table if exists public.survey_responses;
drop table if exists public.protocol_applications;
drop table if exists public.contact_optouts;
drop table if exists public.event_buyers;

delete from storage.buckets b
 where b.id = 'evento'
   and not exists (select 1 from storage.objects o where o.bucket_id = b.id);

-- A edição nasceu nesta migration; só sai se ninguém tiver RSVP nela.
delete from public.event_editions e
 where e.slug = 'imersao-2026-10'
   and not exists (select 1 from public.event_rsvps r where r.edition_id = e.id);

-- Para o CLI voltar a considerar a migration pendente.
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where version = '20260925120000';
  end if;
end $$;

commit;

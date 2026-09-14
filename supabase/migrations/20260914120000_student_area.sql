-- Wealth & Wellness — a área do aluno do Protocol (Fase 9).
--
-- O que muda de natureza aqui: até agora a plataforma guardava direito de
-- acesso e conteúdo de prateleira, iguais para todo mundo que comprou o mesmo
-- produto. Isto é a primeira coisa **de uma pessoa só** — o report semanal
-- dela, o plano do ciclo dela, o contrato dela. A LGPD chama de dado pessoal
-- sensível quando o conteúdo é de saúde, e é o que o report é.
--
-- Por isso três decisões que não existiam nas tabelas anteriores:
--
-- 1. O documento nunca é servido direto. Ele mora num bucket privado sem
--    política nenhuma para `authenticated`, igual à Library: o único caminho é
--    uma URL assinada de curta duração, emitida depois de a política já ter
--    dito sim.
-- 2. Toda leitura é registrada, inclusive a do próprio dono, e inclusive a de
--    um admin. Sem isso não existe resposta para "quem abriu o report da
--    Mônica em 14/09", que é a pergunta que uma auditoria faz.
-- 3. O vínculo aceita e-mail, não só `user_id`. Um documento pode ser subido
--    antes de o aluno logar pela primeira vez, exatamente como um acesso.

create type public.student_doc_kind as enum (
  'weekly_report',   -- report semanal em PDF
  'cycle_plan',      -- Plano do Ciclo e roadmap
  'contract',        -- contrato do arco
  'material'         -- material avulso do acompanhamento
);

create table public.student_documents (
  id           uuid primary key default gen_random_uuid(),

  -- Preenchido pelo gatilho de primeiro login, como em `entitlements`. Fica
  -- nulo enquanto o aluno não entrou, e o casamento por e-mail cobre o vão.
  user_id      uuid references auth.users(id) on delete cascade,
  -- Texto normalizado com CHECK, nunca citext: é a decisão do schema original
  -- e ela tem motivo escrito lá — sem extensão, não há `search_path` de
  -- extensão para errar, e índice b-tree e igualdade funcionam como se espera.
  email_norm   text not null check (email_norm = public.norm_email(email_norm)),
  email_raw    text not null,

  kind         public.student_doc_kind not null,
  title        text not null,
  -- "Semana 3 (08-14 set)", "Arco 1", "Ciclo 2 · bloco 1". Texto livre porque
  -- a nomenclatura do acompanhamento é do Kauã, não do banco.
  period_label text,
  storage_path text not null,
  -- A data a que o documento se refere, que não é a data em que subiu.
  issued_at    date not null default current_date,

  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz not null default now(),

  -- Subir o mesmo documento duas vezes é engano, não versão nova.
  unique (storage_path)
);

create index student_documents_owner_idx on public.student_documents (email_norm, issued_at desc);
create index student_documents_user_idx  on public.student_documents (user_id);

-- ---------------------------------------------------------------- trilha

-- Append-only. Uma linha por leitura de documento de aluno, seja quem for que
-- leu.
--
-- `action` é TEXTO LIVRE e não tem CHECK, de propósito. Uma CHECK numa coluna
-- de ação parece defesa e é armadilha: a rota nova grava um verbo que a
-- constraint não previu, o INSERT falha, e como ninguém interrompe a entrega
-- de um arquivo por causa da trilha, o erro é engolido — o acesso acontece e
-- some do log. É preferível um verbo esquisito registrado a uma leitura de
-- dado de saúde sem registro nenhum.
create table public.document_access_log (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.student_documents(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  -- 'own' quando o dono abriu, 'admin' quando foi o Kauã.
  actor_role  text not null,
  action      text not null,
  created_at  timestamptz not null default now()
);

create index document_access_log_doc_idx  on public.document_access_log (document_id, created_at desc);
create index document_access_log_time_idx on public.document_access_log (created_at desc);

-- ---------------------------------------------------------------- rls

alter table public.student_documents   enable row level security;
alter table public.document_access_log enable row level security;

revoke all on public.student_documents   from anon;
revoke all on public.document_access_log from anon;

grant select on public.student_documents to authenticated;
grant insert, update, delete on public.student_documents to authenticated;

-- A trilha é lida por admin e escrita só pelo service role, pela rota que
-- entrega o arquivo. Ninguém escreve a própria história nem apaga a de outro.
grant select on public.document_access_log to authenticated;
revoke insert, update, delete on public.document_access_log from authenticated;

-- O aluno vê o que é dele, pelas mesmas três pontes de `active_products()`:
-- id, e-mail do JWT ou alias revisado à mão. O admin vê tudo.
create policy student_documents_read_own on public.student_documents
  for select to authenticated
  using (
    user_id = auth.uid()
    or email_norm = public.norm_email(auth.jwt() ->> 'email')
    or email_norm in (
      select a.email from public.identity_aliases a where a.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- Só admin escreve. O aluno nunca cria, edita nem apaga um documento seu —
-- inclusive porque apagar é o que alguém faria para sumir com um contrato.
create policy student_documents_admin_write on public.student_documents
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy document_access_log_read_admin on public.document_access_log
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- bucket

-- Sem política nenhuma para `authenticated` em storage.objects, igual à
-- Library: não existe leitura direta, só URL assinada emitida depois de a
-- política acima ter devolvido a linha.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'students',
  'students',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- primeiro login

-- `handle_new_user()` já carimba `user_id` em `entitlements` quando o aluno
-- entra pela primeira vez. Documentos precisam do mesmo, senão um report
-- subido antes do primeiro login fica para sempre casando só por e-mail — e
-- uma troca de e-mail no Google o tornaria invisível.
create or replace function public.claim_student_documents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.student_documents
     set user_id = new.id
   where user_id is null
     and email_norm = public.norm_email(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created_claim_documents
  after insert on auth.users
  for each row execute function public.claim_student_documents();

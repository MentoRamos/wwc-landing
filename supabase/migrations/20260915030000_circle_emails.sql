-- A régua de e-mails do Circle (Fase 7): o registro do que já foi enviado.
--
-- A régua do funil guarda o ponteiro numa coluna da planilha ("último passo
-- enviado"). Aqui não dá, e não é questão de gosto: a véspera do encontro não
-- é um passo numa sequência, é um envio por quinta-feira. Um ponteiro não
-- consegue dizer "mandei a véspera de 17/09 mas não a de 24/09".
--
-- Então o registro é uma linha por (pessoa, envio), e a idempotência é do
-- banco: `unique (email_norm, step_key)`. Dois ticks simultâneos não mandam
-- duas vezes porque o segundo INSERT colide, e não porque o código lembrou de
-- conferir. Trava que depende de alguém lembrar não é trava.
--
-- `step_key` é TEXTO LIVRE, sem CHECK nem enum. Pelo mesmo motivo que
-- `document_access_log.action`: a chave da véspera carrega uma data dentro
-- (`meeting_2026-09-17`), e uma constraint que tente prever isso ou vira
-- regex frágil ou recusa o envio de uma quinta que ninguém previu.

create table public.circle_emails (
  id         uuid primary key default gen_random_uuid(),

  email_norm text not null check (email_norm = public.norm_email(email_norm)),
  step_key   text not null,

  -- 'pending' enquanto o envio está em voo, 'sent' quando o provedor aceitou,
  -- 'failed' quando recusou. A linha nasce pending e é ela que reserva a vaga:
  -- reservar antes de enviar é o que impede o envio duplo, e marcar 'sent' só
  -- depois é o que impede alguém perder o passo por uma falha de rede.
  status     text not null default 'pending',
  error      text,

  sent_at    timestamptz,
  created_at timestamptz not null default now(),

  unique (email_norm, step_key)
);

create index circle_emails_status_idx on public.circle_emails (status, created_at desc);

alter table public.circle_emails enable row level security;

revoke all on public.circle_emails from anon;
grant select on public.circle_emails to authenticated;
revoke insert, update, delete on public.circle_emails from authenticated;

-- Só o admin lê, e ninguém a não ser o service role escreve. O membro não tem
-- por que consultar a própria régua, e teria por que apagá-la.
create policy circle_emails_read_admin on public.circle_emails
  for select to authenticated
  using (public.is_admin());

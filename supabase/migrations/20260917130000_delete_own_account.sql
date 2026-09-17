-- Apagar a própria conta (LGPD art. 18, VI), em uma transação.
--
-- Até aqui a página dizia "escreva para o e-mail e respondemos em 15 dias".
-- Isso atende a lei e não atende a pessoa: quem quer sumir quer sumir agora, e
-- um pedido por e-mail é um passo que depende de alguém lembrar.
--
-- O risco de automatizar é o `delete` com a cláusula errada, que não dá erro:
-- ele apaga a mais, e ninguém descobre porque o dono do dado apagado não está
-- olhando. Daí duas escolhas aqui. Primeira: a função é SECURITY DEFINER mas
-- não recebe parâmetro nenhum — o alvo é sempre `auth.uid()`, então não existe
-- a chamada "apaga a conta do fulano". Segunda: a suíte sempre tem um segundo
-- titular ao lado, e é ele quem prova que a cláusula existe.
--
-- O que NÃO é apagado, e está prometido assim na página e na política:
-- `billing_events` guarda a compra, que é registro fiscal de uma relação que
-- existiu. O acesso morre junto com a conta; a nota, não.
create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  mail  text;
  resumo jsonb := '{}'::jsonb;
  n     integer;
begin
  if uid is null then
    raise exception 'delete_own_account exige uma sessão' using errcode = '28000';
  end if;

  -- O Kauã é o único admin. Se ele apagasse a própria conta, `admin_users`
  -- ficaria vazia, `is_admin()` passaria a devolver false para todo mundo e
  -- ninguém mais conseguiria conceder acesso a ninguém — sem erro nenhum, só
  -- uma plataforma que não se administra mais. Recusar aqui é mais barato que
  -- descobrir isso depois.
  if exists (select 1 from public.admin_users where user_id = uid) then
    raise exception 'conta de administrador não se apaga por aqui' using errcode = '42501';
  end if;

  -- O e-mail também identifica a pessoa: direito concedido antes do primeiro
  -- login e lead capturado no funil moram por e-mail, não por `user_id`.
  select public.norm_email(coalesce(p.email, auth.jwt() ->> 'email'))
    into mail
    from public.profiles p
   where p.id = uid;

  if mail is null then
    mail := public.norm_email(auth.jwt() ->> 'email');
  end if;

  delete from public.student_documents
   where user_id = uid or (mail is not null and email_norm = mail);
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('student_documents', n);

  delete from public.entitlements
   where user_id = uid or (mail is not null and email_norm = mail);
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('entitlements', n);

  delete from public.interest where mail is not null and email_norm = mail;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('interest', n);

  delete from public.circle_emails where mail is not null and email_norm = mail;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('circle_emails', n);

  delete from public.progress where user_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('progress', n);

  delete from public.download_events where user_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('download_events', n);

  delete from public.event_rsvps where user_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('event_rsvps', n);

  delete from public.access_claims where user_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('access_claims', n);

  delete from public.identity_aliases where user_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('identity_aliases', n);

  delete from public.document_access_log where actor_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('document_access_log', n);

  delete from public.profiles where id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('profiles', n);

  -- A trilha de auditoria não é apagada, é anonimizada, e isso tem duas
  -- razões diferentes.
  --
  -- A primeira é legal: "concedi acesso tal dia" é registro de operação, e
  -- apagá-lo destruiria a prova de uma decisão do administrador, não um dado
  -- do titular. O que é dado do titular — quem era o ator, qual era o e-mail
  -- alvo, o que havia no payload — sai.
  --
  -- A segunda é que sem isto a exclusão não roda. O gatilho `entitlements_audit`
  -- dispara no `delete` logo acima e grava uma linha com `actor_id = auth.uid()`,
  -- que é justamente o usuário que estamos prestes a apagar. A própria exclusão
  -- cria a referência que a impediria de terminar.
  update public.admin_audit set actor_id = null where actor_id = uid;
  get diagnostics n = row_count;
  resumo := resumo || jsonb_build_object('admin_audit_anonimizado', n);

  update public.admin_audit
     set target_email = null,
         payload = jsonb_build_object('anonimizado', true)
   where mail is not null and target_email = mail;

  -- A identidade em si. Sem isto, a conta "apagada" volta inteira no próximo
  -- login com o mesmo Google, e a pessoa que pediu para sumir não sumiu.
  delete from auth.users where id = uid;

  return resumo;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

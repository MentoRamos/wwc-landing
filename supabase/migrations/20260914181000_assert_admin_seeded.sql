-- A prova de que o seed anterior pegou.
--
-- `insert ... select` que não acha ninguém insere zero linhas e termina com
-- sucesso. O `db push` imprime "Applying migration" e sai 0 nos dois casos, e
-- o sintoma de ter falhado é `/admin` respondendo o mesmo 404 de sempre — ou
-- seja, indistinguível do estado anterior. Sem esta checagem, "rodei o seed"
-- é uma afirmação que ninguém consegue conferir.
--
-- A condição tem duas metades de propósito. Ela só cobra o resultado quando a
-- conta de fato existe em `auth.users`; num banco novo, onde o seed é um no-op
-- legítimo porque ninguém logou pelo Google ainda, a checagem se cala em vez
-- de quebrar o `db reset` local.
do $$
begin
  if exists (
       select 1 from auth.users
       where public.norm_email(email) = public.norm_email('kaua3ramos@gmail.com')
     )
     and not exists (select 1 from public.admin_users)
  then
    raise exception
      'A conta existe em auth.users e admin_users continua vazia: o seed nao pegou.';
  end if;
end $$;

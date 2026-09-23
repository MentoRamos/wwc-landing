-- Quem lê a sonda precisa poder apagá-la.
--
-- A tabela nasceu só com leitura de admin, e isso deixou uma dívida de
-- privacidade sem forma de quitar: o corpo cru carrega nome, e-mail e
-- documento de quem comprou, e a própria migration que a criou diz que a
-- linha é descartável assim que a assinatura estiver entendida.
--
-- Sem uma política de delete, "descartável" dependia de alguém abrir o SQL
-- editor da produção — ou seja, nunca acontecia, e o dado de uma pessoa
-- ficava parado numa tabela de diagnóstico para sempre.
--
-- O delete vai pela política, não por service role: é o mesmo `is_admin()`
-- que já decide a leitura, e um defeito na tela falha contra a política em
-- vez de passar por fora dela.
grant delete on public.webhook_probes to authenticated;

create policy webhook_probes_discard_admin on public.webhook_probes
  for delete to authenticated
  using (public.is_admin());

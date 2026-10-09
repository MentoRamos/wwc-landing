-- Torna alguém admin da plataforma.
--
-- Rode isto no SQL Editor do Supabase (ele roda como service role). Não dá
-- para fazer pela aplicação de propósito: `admin_users_opaque` recusa leitura
-- e escrita para todo mundo autenticado, e `is_admin()` é a única janela para
-- a tabela. Um admin que se promove sozinho por uma linha de JS é exatamente o
-- que essa política existe para impedir.
--
-- Sem nenhuma linha aqui, `is_admin()` devolve false para todos e /admin
-- inteiro responde 404 — o mesmo 404 de um endereço inventado, então nada na
-- tela diz que o motivo é este. Foi o que aconteceu: o "seed do Kauã admin"
-- estava no plano da Fase 3 e nunca virou código, então as três telas
-- (acessos, interesse, conteúdo) nunca foram alcançáveis em produção.

insert into public.admin_users (user_id)
select id
from auth.users
where email = 'kaua3ramos@gmail.com'
on conflict (user_id) do nothing;

-- Confere. Tem que devolver uma linha; zero linhas significa que esse e-mail
-- ainda não fez o primeiro login pelo Google, e portanto não existe em
-- auth.users para ser promovido.
select u.email, a.created_at
from public.admin_users a
join auth.users u on u.id = a.user_id;

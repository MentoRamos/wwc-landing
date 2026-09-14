-- O primeiro admin da plataforma.
--
-- Isto existia como `supabase/snippets/seed-admin.sql`, para ser colado à mão
-- no SQL Editor, e por isso nunca foi rodado: a tela de admin foi construída,
-- testada e publicada, e `/admin` respondeu 404 em produção por três dias
-- porque `admin_users` estava vazia. `is_admin()` devolve false para todo
-- mundo quando ela está vazia, e o 404 de "não é admin" é o mesmo 404 de um
-- endereço inventado — nada na tela diz qual dos dois é.
--
-- Vira migration porque o que precisa existir para o sistema funcionar
-- pertence ao esquema, não a um bilhete de instruções. A senha do banco mora
-- no keychain e só o `db push` a alcança, então este é também o único caminho
-- automatizável que existe: pela aplicação é impossível de propósito, já que
-- `admin_users_opaque` recusa leitura e escrita para todo `authenticated` e um
-- admin que se promove sozinho por uma linha de JS é exatamente o que essa
-- política impede.
--
-- Duas honestidades sobre o alcance disto:
--
-- 1. É idempotente (`on conflict do nothing`), então reaplicar não duplica.
-- 2. Num banco novo ele não faz nada, e isso é silencioso. O `select` só acha
--    alguém que já exista em `auth.users`, ou seja, que já tenha entrado pelo
--    Google ao menos uma vez. Em desenvolvimento local isso é um no-op
--    correto; em produção funciona porque a conta já existe. Não dá para
--    resolver criando o usuário aqui: `auth.users` é do GoTrue, e uma linha
--    forjada nela não tem identidade OAuth e não loga.

insert into public.admin_users (user_id)
select id
from auth.users
-- Normaliza os dois lados. O GoTrue costuma guardar em caixa baixa, mas
-- "costuma" não é garantia, e uma comparação que falha aqui falha em
-- silêncio: zero linhas inseridas, exit 0, /admin continua 404.
where public.norm_email(email) = public.norm_email('kaua3ramos@gmail.com')
on conflict (user_id) do nothing;

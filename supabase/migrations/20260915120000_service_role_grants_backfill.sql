-- Os privilégios que faltaram, e o fim da lista escrita à mão.
--
-- Este defeito aconteceu duas vezes. A primeira foi corrigida em
-- `20260911120000_service_role_grants.sql`, cujo comentário diz a parte que
-- importa: localmente isso é invisível. Um Supabase local concede tudo por
-- padrão, então o servidor funciona na máquina, passa nos testes, sobe, e só
-- em produção o service role descobre que não pode escrever.
--
-- A segunda foi consequência da forma da primeira: ela era uma LISTA de doze
-- tabelas. Quatro nasceram depois. `interest` lembrou de se conceder; as três
-- de 14 e 15/09 não. O que isso produziu em produção:
--
--   * `circle_emails`: a régua reservava, a reserva falhava, o erro era
--     descartado e o tick respondia "zero enviados" como se estivesse em dia.
--   * `document_access_log`: a trilha bloqueia a entrega do documento por
--     desenho, então a rota de download do aluno recusava TODO MUNDO com 503.
--     A Fase 9 foi para produção quebrada e os testes locais passaram.
--   * `student_documents`: sem escrita pelo service role.
--
-- Uma escrita negada não parece bug de permissão. Parece nada: a linha
-- simplesmente não aparece, e quem olha conclui que não havia o que escrever.

grant all on
  public.student_documents,
  public.document_access_log,
  public.circle_emails
to service_role;

-- E o remédio para não haver uma terceira vez.
--
-- `alter default privileges` vale para tabela criada DEPOIS dele pelo mesmo
-- role, que é como toda migration daqui roda. A lista acima conserta o
-- passado; esta linha conserta o futuro, e é ela que tira o problema da
-- categoria "alguém precisa lembrar".
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Os episódios que cada episódio cita em voz alta.
--
-- Pedido do Kauã em 09/10/2026: ao longo do conteúdo, o podcast indica outros
-- episódios já no ar ("se você ainda não ouviu o episódio 21, sobre vitamina D,
-- o link está na descrição"). O roteiro é escrito pelo cron do servidor, que
-- escolhe as citações; o publicador manda os slugs junto com o áudio, e o feed
-- transforma em links nas notas do episódio. Sem esta coluna, a frase falada
-- prometeria um link que não existe.
--
-- Array de slugs e não tabela de junção: são no máximo três, lidos sempre
-- junto com o artigo, e citação de episódio que sumiu do feed é descartada na
-- leitura (`podcastEpisodes`), não precisa de chave estrangeira.

alter table public.articles
  add column podcast_refs text[] not null default '{}'
    check (cardinality(podcast_refs) <= 3);

-- Sem grant novo para `authenticated`: como o áudio, só o endpoint com o token
-- de ingestão escreve aqui.

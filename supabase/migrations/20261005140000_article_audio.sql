-- O "ouvir o artigo" deixa de ser a voz do aparelho e passa a ser um arquivo.
--
-- Até aqui o botão falava pela Web Speech API: grátis, sem arquivo e sem
-- chave (decisão de 15/09). O custo apareceu em 05/10, no iPhone do Kauã: a
-- voz do sistema sai robótica ao ponto de ele não conseguir ouvir o artigo
-- dele até o fim. Voz boa não é ajuste, é arquivo — e arquivo precisa de
-- onde morar.
--
-- O bucket é PÚBLICO, e não privado com URL assinada como a `library`. Três
-- razões, na ordem que decidiu:
--
-- 1. O artigo é público por decisão de 15/09. O áudio é o mesmo texto lido em
--    voz alta: ele não guarda nada que a página já não entregue ao estranho.
-- 2. URL assinada expira. Um episódio de dez minutos ouvido no carro, com a
--    tela apagada, atravessa a validade e para no meio.
-- 3. `<audio>` pede pedaço por pedaço (Range) quando a pessoa arrasta a
--    barra. Isso quer uma URL estável e cacheável, não uma por sessão.
--
-- O caminho do objeto nasce do slug mais a impressão digital do arquivo
-- (`omega-3-fibrilacao-ab12cd34.ogg`). Áudio novo para o mesmo artigo é
-- caminho novo, então o cache de um ano é seguro e ninguém ouve a versão
-- velha; o endpoint apaga o objeto anterior depois de gravar o novo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-audio',
  'article-audio',
  true,                       -- servido direto, sem assinar: o artigo é público
  26214400,                   -- 25 MiB: o episódio de 10 min medido tem 3,5 MB
  array['audio/ogg', 'audio/mpeg']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma política em `storage.objects`, e isso não é esquecimento: bucket
-- público é lido pelo endpoint `/object/public`, que não passa por RLS, e
-- quem escreve é o service role dentro de `/api/artigos/[slug]/audio`.
-- Ninguém logado sobe nem apaga áudio direto pelo PostgREST.

alter table public.articles
  add column audio_path text
    check (audio_path ~ '^[a-z0-9]+(-[a-z0-9]+)*\.(ogg|mp3)$' and length(audio_path) <= 110),
  -- A duração para o botão poder dizer "10 min" antes de baixar 3 MB. O
  -- teto de 2 horas é absurdo de propósito: ele existe para recusar número
  -- errado (milissegundos mandados como segundos), não para limitar episódio.
  add column audio_seconds integer check (audio_seconds between 1 and 7200);

-- Sem `grant update (audio_path)` para `authenticated`. O admin esconde o
-- artigo inteiro com um clique, que é o botão de emergência que ele precisa;
-- trocar e apagar áudio é só pelo endpoint com o token, do mesmo jeito que o
-- texto. Uma coluna de caminho escrita pelo navegador é um objeto de storage
-- público apontado por quem tiver um JWT de admin roubado.

# Ouvir o artigo

O botão "Ouvir o artigo" tem dois caminhos, e a página escolhe sozinha:

1. **Com áudio no banco** (`articles.audio_path`): toca o arquivo que o servidor
   sintetizou, um bate-papo de dois apresentadores sobre o texto, no estilo
   podcast. Player com pausa, voltar 15 segundos, velocidade e download.
2. **Sem áudio**: fala pela voz do próprio aparelho (Web Speech API), como era
   desde 15/09. É o que os artigos antigos usam, e é a rede de segurança para
   quando o arquivo não carrega.

Por que o arquivo existe: em 05/10 o Kauã tentou ouvir o artigo no iPhone e a
voz do sistema saiu robótica ao ponto de não dar para acompanhar. Não havia voz
para ajustar — a Web Speech API usa a voz do aparelho, e ponto. Som bom exige
arquivo.

## Onde o áudio mora

Bucket **público** `article-audio` (migration `20261005140000_article_audio.sql`),
25 MiB por arquivo, `audio/ogg` e `audio/mpeg`.

É público porque o artigo é público desde 15/09: o áudio é o mesmo texto lido em
voz alta. E porque URL assinada expira no meio de um episódio de dez minutos
ouvido no carro, além de atrapalhar o `Range` que o `<audio>` usa para a barra
de progresso.

O nome do objeto é `<slug>-<8 hex do sha256>.ogg`. A impressão digital do
conteúdo no nome é o que torna seguro o `max-age` de um ano: áudio novo é nome
novo, e ninguém ouve a versão velha por conta do CDN. O endpoint apaga o objeto
anterior depois de a coluna já apontar para o novo.

`audio_seconds` existe só para o botão escrever "10 min" antes de o leitor
baixar 3,5 MB. O `<audio>` corrige a duração quando os metadados chegam, então
número torto ali é descartado em silêncio, nunca motivo para recusar o arquivo.

## Como o áudio entra

Mesmo token do texto (`ARTICLES_INGEST_TOKEN`), nenhuma variável nova:

```
POST /api/artigos/<slug>/audio
authorization: Bearer $ARTICLES_INGEST_TOKEN
content-type: audio/ogg
x-audio-seconds: 607          # opcional, só para a tela
<bytes>
```

Do servidor, sempre por este comando, que mede a duração, confere o arquivo
antes de subir e baixa o primeiro quilobyte da URL pública como prova:

```
python3 /srv/nexgen/workspaces/niva-brain/ops/artigos/publicar-podcast.py <slug> <arquivo.ogg>
```

O episódio é gerado por `ops/artigos/podcast-artigo.py` no mesmo repositório
(TTS multi-speaker do Gemini, em blocos, porque a latência cresce com o tamanho
do texto).

## Como o áudio sai do ar

```
DELETE /api/artigos/<slug>/audio
authorization: Bearer $ARTICLES_INGEST_TOKEN
```

Limpa a coluna primeiro e apaga o objeto depois, nessa ordem: entre as duas
coisas a página já voltou para a voz do aparelho, em vez de mostrar um player
que não toca. Existe porque voz errada no ar não pode depender de um deploy
para ser desfeita — é o mesmo papel que `hidden_at` faz pelo texto.

O admin **não** consegue escrever `audio_path` pelo navegador (não há
`grant update` dessa coluna). Um JWT de admin roubado não aponta o player para
um objeto qualquer do bucket.

## Antes de subir uma mudança aqui

- `npm test` cobre o cálculo de caminho, URL, duração e relógio
  (`tests/audio.core.test.ts`).
- A migration mexe em `storage.buckets` e nas colunas de `articles`: rode
  `npm run test:rls` com `supabase start` antes do deploy.

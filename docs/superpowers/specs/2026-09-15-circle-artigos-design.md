# Artigos do Circle — design

Data: 15/09/2026 · Aprovado pelo Kauã em conversa (opção A, modo Ralph).

## O problema

O cron `KauaContentReady` (OpenClaw, `nexgen-core-01`, todo dia às 10h) pesquisa um tema de
fitness, performance, saúde ou longevidade em fonte primária e entrega no WhatsApp um kit de
carrossel de Instagram. O Kauã não posta os carrosséis. A pesquisa é boa e se perde.

## O que muda

O mesmo cron passa a escrever um **artigo** e publicá-lo sozinho em
`kauaramos.com/circle/artigos/<slug>`. O WhatsApp recebe só título, uma frase e o link.
O carrossel deixa de ser gerado.

## Decisões (do Kauã, 15/09, não reabrir)

- **Aberto**: qualquer um lê e o Google indexa. Cada artigo termina convidando pro Circle.
  O exclusivo do assinante continua sendo o encontro e as gravações.
- **Publica sozinho**. O Kauã despublica com 1 clique no `/admin/artigos` se algo sair errado.
- **Carrossel para**. Sem slides, legenda, stories ou DM.
- **Acervo**: os 11 kits de 03/09 a 14/09 viram os primeiros artigos, com a data original.

## Arquitetura

```
OpenClaw (10h) ──pesquisa──> artigo.json ──publicar-artigo.sh──> POST /api/artigos
                                                                   │ Bearer ARTICLES_INGEST_TOKEN
                                                                   │ Zod (articles.core)
                                                                   ▼
                                                     Supabase public.articles (upsert por slug)
                                                                   │ RLS: anon lê publicado
                                                                   ▼
                                  kauaramos.com/circle/artigos ──rewrite /circle/:path*──> wwc-landing
```

O script só manda o link pro WhatsApp **depois de abrir a URL pública e achar o título**.
Aceite do endpoint não é prova de que o artigo está no ar.

Alternativas descartadas: service role no servidor (o banco guarda documento de aluno) e commit
de MDX + deploy (cada artigo vira um deploy; o repo é publicado do Mac).

## Banco — `public.articles`

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid pk | |
| `slug` | text unique | `^[a-z0-9]+(-[a-z0-9]+)*$`, até 90 |
| `title` | text | até 140 |
| `dek` | text | linha fina, até 300 |
| `body_md` | text | markdown restrito, 1.500 a 40.000 caracteres |
| `sources` | jsonb | 1 a 30 itens `{label, url}`, url só `https` |
| `topic` | text null | até 40 |
| `source_kit` | text null | pasta do kit no servidor |
| `published_at` | timestamptz | data que o leitor vê |
| `hidden_at` | timestamptz null | não nulo = despublicado pelo admin |
| `created_at`, `updated_at` | timestamptz | |

- **Leitura pública**: `hidden_at is null and published_at <= now()`, pra `anon` e `authenticated`.
  É a primeira tabela que `anon` lê; o grant é explícito na migration.
- **Escrita**: só admin (via RLS, cliente do usuário) e service role (endpoint de ingestão).
- **Reenvio não republica**: o upsert por slug nunca toca em `hidden_at`. Se o Kauã escondeu
  um artigo e o cron reenviar o mesmo slug, o artigo continua escondido.

## Validação (`lib/core/articles.core.ts`, pura e testada)

Recusa com mensagem legível (o cron lê a mensagem e corrige):

- slug fora do formato; título, linha fina ou corpo fora do tamanho;
- `# ` (h1) no corpo: o título já é o h1 da página;
- HTML cru no corpo (`<tag`);
- travessão (`—`) em título, linha fina ou corpo: regra de voz da marca;
- fonte sem `https`, ou nenhuma fonte;
- `published_at` inválido ou mais de 1 dia no futuro.

Também calcula o tempo de leitura (palavras/200, arredondado pra cima, mínimo 1).

## Páginas

- `/circle/artigos`: lista do mais novo pro mais antigo (título, linha fina, data, tempo de leitura).
- `/circle/artigos/[slug]`: artigo, fontes numeradas e clicáveis, **aviso fixo** "não substitui
  avaliação médica" e **convite fixo** pro Circle, os dois no componente e não no texto do modelo.
  Slug inexistente ou escondido responde **404 de verdade** (sem `loading.tsx` acima).
- `/circle`: bloco com os 3 artigos mais recentes, nas duas caras da página.
- `SiteNav`: link "Artigos".
- Markdown renderizado com `react-markdown`, sem HTML cru, elementos permitidos:
  `p h2 h3 ul ol li strong em a blockquote hr`. Link externo abre em nova aba.
- Imagem de compartilhamento por artigo (`opengraph-image`), título na identidade W&W.
- SEO: `sitemap.xml` dos artigos em `/circle/artigos/sitemap.xml`; canonical; JSON-LD `Article`.

## Admin — `/admin/artigos`

Lista todos, inclusive escondidos, com o botão **Despublicar / Republicar** (mexe só em
`hidden_at`). Server Action com `requireAdmin()` e cliente do usuário; a política
`articles_admin_write` é o portão real. Sem edição de texto na v1.

## Endpoint — `POST /api/artigos`

- `Authorization: Bearer $ARTICLES_INGEST_TOKEN`, comparação de tempo constante
  (`cronAuthorized`). Sem token configurado, recusa todo mundo.
- Corpo validado por `parseArticleInput`. 400 com a mensagem da primeira falha.
- Upsert por slug com service role; devolve `{ ok, slug, url, created }`.
- Chamado em `https://wwc-landing-rho.vercel.app/api/artigos` (o `/api/artigos` não passa pelos
  rewrites do estático, e não precisa).

## O cron

`KauaContentReady` ganha prompt novo: mesma pesquisa e as mesmas regras de checagem (fonte
primária; número sem segunda fonte é descartado e registrado; conformidade), mas a entrega é o
artigo, gravado em `content/wwp/<data>-<tema>/artigo.json` + `LEIA-ME.md` e publicado por
`/srv/nexgen/runtime/claude-kaua/content/bin/publicar-artigo.sh`. O token fica em arquivo
`600` do usuário `openclaw`. Se a publicação falhar, o WhatsApp avisa em uma linha, com o motivo.

Guia editorial em `docs/artigos/guia-editorial.md`, o mesmo texto no servidor e nos subagentes
que convertem o acervo.

## Testes

- Unit (`tests/articles.core.test.ts`): cada recusa da validação, o caso feliz, tempo de leitura.
- RLS (`tests/rls.test.ts`): anon lê publicado; não lê escondido nem agendado; anon e membro
  não escrevem; admin escreve.
- Aceite (`scripts/check-artigos.mjs`, contra servidor construído e Postgres real): token
  ausente e errado → 401; payload inválido → 400; publicar → página 200 com o título; reenviar
  o mesmo slug não duplica; esconder → página 404 e reenvio não republica.
- `tests/no-streaming-above-404.test.ts` já varre `app/` e cobre a rota nova.

## Fora da v1

Comentários, newsletter dos artigos, foto de capa por artigo, edição de texto no admin.

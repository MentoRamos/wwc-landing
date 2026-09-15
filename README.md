# Wealth & Wellness — a plataforma

Connect, Circle, Biblioteca e a área do aluno sob um login só. Next 16 +
Supabase, servida em `kauaramos.com` por rewrites do repositório do funil.

> **Leia o `AGENTS.md` antes de escrever código.** Este não é o Next.js que você
> conhece: a versão aqui renomeou `middleware.ts` para `proxy.ts`, entre outras
> quebras. Um `middleware.ts` esquecido **compila, passa no typecheck e não
> roda** — a sessão para de renovar e as pessoas deslogam sozinhas, sem erro no
> log. Há um guard de build contra isso.

---

## A regra que sustenta o sistema

`expires_at IS NULL` é vitalício. `expires_at > now()` é enquanto pagar. Mesma
tabela, mesma coluna, e **a verificação vive dentro da política RLS** — não num
cron. Se o webhook da Kiwify morrer, ninguém ganha acesso indevido: o acesso
expira sozinho na data.

Disso decorre o resto: **a query é a autorização.** A página consulta com o
cliente *do usuário*; sem direito, o RLS devolve zero linhas e a página vira
404. Não existe `if (temAcesso)` para alguém esquecer de escrever numa rota
nova. Só o webhook e a assinatura de URL usam service role.

`active_products()` casa o direito por `user_id`, **por e-mail do JWT** ou por
alias. É esse `or e.email_norm = auth.jwt()->>'email'` que faz um acesso
concedido hoje já estar lá no primeiro login de quem nunca entrou, sem passo de
resgate.

---

## Rotas

| Grupo | Rotas | Quem entra |
|---|---|---|
| `app/(site)` | `/`, `/circle`, `/entrar`, `/termos`, `/privacidade`, `/sem-acesso` | qualquer um |
| `app/(event)` | `/connect` | qualquer um |
| `app/(app)` | `/inicio`, `/biblioteca`, `/biblioteca/[slug]`, `/conta`, `/aluno` | logado |
| `app/admin` | `/admin/acessos`, `/admin/conteudo`, `/admin/documentos`, `/admin/interesse` | admin |
| `app/api` | `auth/*`, `biblioteca/[slug]/download`, `aluno/[id]/download`, `webhooks/kiwify`, `interesse`, `cron/regua` | varia |

`/circle` tem duas faces no mesmo endereço: quem não assina vê a oferta, quem
assina vê o próximo encontro.

---

## Ambiente local

```bash
npm install
npx supabase start          # Postgres, GoTrue, Storage
npm run dev
```

> ⚠️ **`.env.local` aponta para PRODUÇÃO.** Rodar script de aceite sem
> sobrescrever cria usuário de teste no banco real. Antes de qualquer
> `check:*`, exporte o stack local por cima:
>
> ```bash
> eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
> export NEXT_PUBLIC_SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
> export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
> ```

Variáveis: veja `.env.example`. Sem `RESEND_API_KEY` a régua responde 200
dizendo que pulou, em vez de falhar — a Vercel repete um cron que falha, e
repetir não configura variável nenhuma.

---

## Testes

```bash
npm test          # 253 unitários, sem rede e sem banco
npm run test:rls  # 33 asserções de RLS contra o Postgres local
```

**Nunca mockar o banco em teste de integração.** A suíte de RLS sobe duas
contas de verdade e prova o que importa: aluno A não enxerga nada do aluno B.

### Scripts de aceite

Dirigem o **servidor buildado** com sessões reais. Precisam de
`npm run build && npx next start` no ar e do stack local exportado.

| Script | O que prova |
|---|---|
| `check:auth` | sessão abre a plataforma, e a falta dela fecha |
| `check:admin` | admin concede; membro comum toma 404, não redirect |
| `check:library` | sem direito, 404 no download; o caminho nunca aparece no HTML |
| `check:aluno` | documento chega ao dono, não chega a mais ninguém, e a leitura vira trilha |

`seed:library` põe os cinco guias no bucket. É idempotente.

### Travas que existem porque o defeito aconteceu

`tests/copy.test.ts` (zero travessão em texto visível, inclusive `&mdash;`) ·
`tests/layout.test.ts` (nenhum `max-w-*` prendendo o layout da área logada) ·
`tests/first-paint.test.ts` (o conteúdo existe antes do JavaScript) ·
`tests/grants.test.ts` (toda tabela criada concede a `service_role`) ·
`tests/no-streaming-above-404.test.ts`.

Todas andam o código em vez de conferir uma lista escrita à mão. **Lista à mão
passa verde com o defeito vivo**, porque o arquivo novo não está nela — foi
exatamente assim que três tabelas subiram sem privilégio de `service_role` e
quebraram em produção enquanto os testes locais passavam.

---

## Banco

```bash
npx supabase db push --linked    # aplica as migrations pendentes em produção
npx supabase migration list --linked
```

Migrations são revisadas antes de ir para produção, sempre.

⚠️ **Toda tabela nova em `public` precisa conceder a `service_role` na própria
migration.** O Supabase local concede tudo por padrão, então a omissão é
invisível na sua máquina: funciona, passa nos testes, sobe, e só lá o service
role descobre que não pode escrever — em silêncio, porque escrita negada não
parece erro de permissão, parece que não havia o que escrever.
`20260915120000` adicionou `alter default privileges` para cobrir o futuro, e
`tests/grants.test.ts` reprova quem esquecer.

---

## Deploy

```bash
npx vercel --prod
```

O domínio é servido pelo repositório do funil
(`wealth-wellness-protocol/landing-kauaramos`), cujo `vercel.json` encaminha os
caminhos da plataforma para cá. **Rota nova precisa entrar naquela lista**, senão
ela abre no `.vercel.app` e dá 404 em `kauaramos.com`.

O cron da régua está em `vercel.json` (10h de Brasília) e se autentica por
`Authorization: Bearer $CRON_SECRET`, comparado em tempo constante.

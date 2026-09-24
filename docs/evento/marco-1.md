# Automação da Imersão · Marco 1 (operação)

O que o código do Marco 1 faz e o que precisa ser feito à mão antes de ir
para produção. Design completo: `Automação - Pós-compra e aquecimento
(design v1, 24 set 2026).md` (iCloud, `Estratégia - W&W/`).

## O que roda

- Webhook da Kiwify: compra aprovada do ingresso cria `event_buyers` e
  enfileira `message_jobs` (T0 por e-mail e WhatsApp, +15 min, +3h, +6h, e a
  contagem por e-mail). Reembolso/chargeback do ingresso marca o comprador e
  cancela o que está pendente. Gravação (R$ 67), reserva do Protocol
  (R$ 1.000) e Protocol marcam o comprador pelo e-mail.
- A T0 por e-mail sai no `after()` do webhook. Os outros jobs ficam
  pendentes: o tick de e-mail e o worker do WhatsApp são dos Marcos 2 e 3.
- `/imersao/pesquisa`: 8 perguntas + consentimento; ao enviar, devolve a
  Ficha da Hora Fixa por URL assinada de 10 minutos.

## Antes de produção (nesta ordem)

1. Revisar e aplicar a migration `supabase/migrations/20260925120000_evento_automacao.sql`
   (`npx supabase db push --linked`, só com OK do Kauã).
2. `RECORDING_CUTOFF_AT` (`lib/core/evento.core.ts`) já está fechado em
   **24/09 17:35Z (14:35 -03:00)**, commit `498b7d1`: o deploy de `f805e12`
   na Vercel (`wwc-landing-ajqc1s5vi`) foi criado às 14:29:21 -03:00, e o
   corte tem 5 minutos de folga a favor de quem comprou. Nada a fazer aqui,
   a não ser que o Kauã queira outro horário (mudar antes do primeiro
   comprador registrado: a coluna `includes_recording` não é recalculada).
3. Variáveis na Vercel (valores fora do chat): `EVENTO_LINK_SECRET`,
   `EVENTO_MODE`, `EVENTO_SANDBOX_ALLOWLIST`, `EVENTO_TEST_PRODUCT_IDS`,
   `RESEND_DAILY_BUDGET`. Começar com `EVENTO_MODE` vazio (sandbox) e o
   produto de teste; virar `live` só depois da compra de teste.
4. Subir a Ficha no Storage (passo manual abaixo).
5. Deploy (`npx vercel --prod`). Rewrites: `/imersao/:path*` já existe no
   `landing-kauaramos`, então `/imersao/pesquisa` e o POST da server action
   já chegam aqui sem mudança lá.

## Limitações conhecidas (Marco 1)

Aceitas conscientemente; nenhuma envia mensagem errada, mas algumas deixam
coisa parada até o Marco 3.

- **T0 que não saiu fica parada até o tick do Marco 3.** O `after()` tenta
  uma vez. Se foi adiada (sandbox, sem `EVENTO_LINK_SECRET`, Resend fora,
  cota), volta a `pending` com o motivo em `error`; se a função morreu no
  meio, fica `claimed` com `lease_until` vencido (10 min). Quem devolve os
  dois para envio é o tick de e-mail do Marco 3: `claimed` com lease vencido
  vira `pending`, e o `Idempotency-Key = evento-<jobId>` impede e-mail
  duplicado se o primeiro envio chegou a sair. Consequência prática: virar
  `EVENTO_MODE=live` não manda, sozinho, as T0 de quem comprou antes; elas
  saem no primeiro tick. (No WhatsApp é diferente: lease vencido vira
  `unknown`, sem reenvio, porque lá não há chave de idempotência.)
- **O link da pesquisa não expira e depende de um segredo só.** O token
  `t=<buyer_id>.<hmac>` vale enquanto `EVENTO_LINK_SECRET` for o mesmo.
  Trocar o segredo invalida todos os links já enviados na T0 (a pessoa cai
  no modo "informe o e-mail", que ainda funciona, só não atualiza resposta
  antiga). Trocar só se vazar, e de preferência antes das T0 em volume.
- **Sandbox usa só o primeiro endereço da allowlist.** Os envios do produto
  de teste vão para o primeiro e-mail válido de `EVENTO_SANDBOX_ALLOWLIST`;
  os demais são ignorados.
- **Gravação, reserva e Protocol marcam o comprador só pelo e-mail.** Quem
  compra o upsell com outro e-mail não é marcado (a função devolve 0, que
  fica em `billing_events.result`), e o reembolso desses três produtos não
  desmarca nada: o `billing_events` guarda o evento para conferência manual.

## Rollback da migration

`supabase/rollback/20260925120000_evento_automacao.down.sql`, fora de
`supabase/migrations/` para o CLI não aplicar. Só com OK do Kauã: apaga
compradores, fila, opt-outs, pesquisa e aplicações (exportar antes);
`billing_events` fica. Roda numa transação, tira a migration de
`supabase_migrations.schema_migrations` e só apaga o bucket `evento` se ele
estiver vazio (Storage não se apaga por SQL: esvaziar pelo painel antes).
Testado em Postgres local: aplicar, reverter e reaplicar volta ao mesmo
estado.

## Rate limit da pesquisa (passo manual, Firewall da Vercel)

A server action da pesquisa é um POST público. Sem o token do e-mail T0, ela
só insere resposta nova (nunca sobrescreve a de outra pessoa), mas continua
respondendo se um e-mail tem ingresso. Para segurar enumeração e spam por
volume, criar à mão, antes de virar `live`:

- Vercel → projeto `wwc-landing` → Firewall → Configure → New Rule.
- Nome: `imersao-pesquisa-rate-limit`.
- If: Request Path equals `/imersao/pesquisa` **and** Method equals `POST`.
- Then: Rate Limit, Fixed Window, 60 s, **10 requisições**, chave por IP;
  ação ao estourar: Deny (429).
- Publicar e conferir com 11 POSTs seguidos de um IP (o 11º volta 429).

O rewrite do `landing-kauaramos` repassa `/imersao/:path*`; a regra vale no
projeto que recebe a requisição final (`wwc-landing`). Se o POST chegar pelo
domínio `kauaramos.com`, conferir também se o IP que a Vercel vê é o do
visitante e não o do proxy do outro projeto; se for o do proxy, a regra tem
que ir para o `landing-kauaramos`.

## Upload da Ficha da Hora Fixa

O bucket `evento` é privado e não tem política para ninguém; só a server
action da pesquisa gera a URL assinada. O arquivo precisa estar exatamente em
`evento/ficha-hora-fixa.pdf`.

- Painel do Supabase → Storage → bucket `evento` → Upload → escolher o PDF e
  garantir que o nome final seja `ficha-hora-fixa.pdf`. Só PDF, até 10 MiB.
- Para trocar a Ficha depois, subir de novo com o mesmo nome (substituir).
- Sem o arquivo, a pesquisa salva as respostas e diz que a Ficha ainda não
  está disponível; quem reenviar depois do upload recebe o link.

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
2. Confirmar `RECORDING_CUTOFF_AT` em `lib/core/evento.core.ts` com o horário
   do deploy de `f805e12` na Vercel (hoje é provisório: 24/09 17:30Z).
3. Variáveis na Vercel (valores fora do chat): `EVENTO_LINK_SECRET`,
   `EVENTO_MODE`, `EVENTO_SANDBOX_ALLOWLIST`, `EVENTO_TEST_PRODUCT_IDS`,
   `RESEND_DAILY_BUDGET`. Começar com `EVENTO_MODE` vazio (sandbox) e o
   produto de teste; virar `live` só depois da compra de teste.
4. Subir a Ficha no Storage (passo manual abaixo).
5. Deploy (`npx vercel --prod`). Rewrites: `/imersao/:path*` já existe no
   `landing-kauaramos`, então `/imersao/pesquisa` e o POST da server action
   já chegam aqui sem mudança lá.

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

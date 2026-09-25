# Automação da Imersão · Marco 2 (operação)

Continua `marco-1.md`. O Marco 2 põe o relógio dos e-mails para rodar e
traz para a fila quem comprou antes da automação existir.

## O que roda

- **Tick de e-mail** (`lib/evento/tick.ts`, rota `/api/cron/evento`, GET e
  POST com `Authorization: Bearer $CRON_SECRET`):
  1. devolve para `pending` o e-mail `claimed` com lease vencido (o
     `Idempotency-Key = evento-<jobId>` impede e-mail duplicado);
  2. marca `error = 'sem-template'` no passo vencido que ainda não tem modelo
     (hoje só a `t0` tem; a contagem entra no Marco 3) e deixa pendente;
  3. escolhe até 50 vencidos de quem está pago: fora de `live`, só comprador
     de teste; comprador do backfill só com `EVENTO_ANTIGOS_LIBERADO=true`;
  4. envia um por um e para quando a cota compartilhada do Resend acaba.
- **Relógio:** por enquanto só o cron diário da Vercel (`vercel.json`,
  11h UTC = 8h em Brasília). A T0 normal sai na hora pelo `after()` do
  webhook; o tick diário só recolhe o que foi adiado. O `pg_cron` de 5 em 5
  minutos é do Marco 3 (a contagem precisa de hora certa).
- **Backfill** (`lib/evento/backfill.ts`, `npm run evento:backfill`): relê
  `billing_events` da Kiwify desde 23/09 em ordem de chegada e passa cada
  evento pela mesma ponte do webhook com a agenda de comprador antigo:
  `t0` por e-mail e `t0_antigos` no WhatsApp agora, e do resto só o que
  ainda não venceu (sem a oferta da gravação, o convite e os vídeos
  atrasados). Compras dos e-mails de `EVENTO_SANDBOX_ALLOWLIST` (os testes
  do Kauã) e de `--excluir` ficam de fora. Idempotente: rodar duas vezes não
  cria nada novo.

## Como rodar o backfill (depois do db push e do deploy)

1. Ambiente com `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e
   `EVENTO_SANDBOX_ALLOWLIST` (o script nunca imprime nenhum deles).
2. `npm run evento:backfill` → dry-run, só contagens (`register`, `cancel`,
   `mark`, `excluded`, `ignored`).
3. Conferir as contagens com a Kiwify (Vendas › Todas).
4. `npm run evento:backfill -- --executar` → grava compradores e jobs. **Não
   envia nada.**
5. Envio aos antigos só com OK do Kauã: `EVENTO_ANTIGOS_LIBERADO=true` na
   Vercel (e-mail no próximo tick; WhatsApp no próximo claim do worker).

Em 24/09 a conciliação da Kiwify mostrou só compras de teste do próprio Kauã
desde 10/09; o backfill existe para o que for vendido entre agora e o deploy.

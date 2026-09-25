# ww-wa-worker

Envia as mensagens individuais de WhatsApp do pós-compra da Imersão pelo +1
(instância `ww` da Evolution no `ww-evolution-01`). Tarefa 9 do design
`Automação - Pós-compra e aquecimento (design v1, 24 set 2026).md`, opção A
(o worker **puxa** a fila; nenhuma porta aberta).

```
worker ──HTTPS saída, Bearer WA_WORKER_TOKEN──▶ site /api/wa/claim | /api/wa/result
worker ──rede docker ww-evolution_default────▶ http://ww-evolution:8080 (whatsappNumbers, sendText)
```

O worker é burro de propósito: quem decide quem recebe o quê e quando é o site
(silêncio na fila, reembolso, SAIR, gravação incluída, kill switch
`WA_ENABLED` da Vercel). Aqui ficam só as travas locais.

## Modos (`WA_MODE`)

| Modo | O que faz |
|---|---|
| `dry-run` (padrão) | Faz o claim com `dry_run: true`, loga `dry_run job=<id>`, **não chama a Evolution e não reporta resultado** |
| `allowlist` | Só envia pra números em `WA_ALLOWLIST`; qualquer outro vira `skipped` / `not_allowlisted` |
| `live` | Envia pra quem o site mandar |

Travas locais em todos os modos de envio: 20–45 s entre envios, `WA_DAILY_CAP`
(150) por dia, pausa de 30 min depois de 3 envios falhos seguidos, sem claim
enquanto a instância não está `open`, `WA_ENABLED=false` nunca faz claim. No
silêncio (21h30–08h de Brasília) só o `t0` sai; outro passo que chegue é
**segurado** (nem enviado nem reportado: o lease vence e o site marca
`unknown`, no máximo uma vez). Erro do site (401, 404, 5xx, rede) faz backoff
exponencial de 60 s até 15 min, sem derrubar o processo.

Log: uma linha JSON por evento, só `job` id e status. Nunca telefone, nome,
texto ou credencial.

## Contrato HTTP com o site (Marco 2 implementa)

Todas as chamadas são `POST` com `Authorization: Bearer <WA_WORKER_TOKEN>` e
JSON. (O diagrama do design fala em `GET /api/wa/claim`; o worker usa `POST`
porque manda corpo.)

`POST /api/wa/claim`
```json
{ "limit": 1, "mode": "dry-run|allowlist|live", "dry_run": true, "quiet": false }
```
Resposta `200`:
```json
{ "jobs": [ { "id": "uuid", "phone": "5562999990001", "text": "...", "step_key": "t0" } ] }
```
- `jobs: []` = nada a fazer ou kill switch ligado.
- **`dry_run: true` o site NÃO pode reservar o job** (só espiar ou devolver vazio);
  em dry-run o worker não reporta, então um lease criado aqui viraria `unknown`.
- `quiet: true` avisa que o worker está no horário de silêncio (o site já não
  deveria devolver passo ≠ `t0`).

`POST /api/wa/result`
```json
{ "id": "uuid", "status": "sent|failed|no_whatsapp|skipped", "reason": "...", "wa_jid": "...@s.whatsapp.net", "message_id": "..." }
```
`reason` em `failed` é `lookup_http_<n>`, `send_http_<n>` ou `invalid_job`; em
`skipped` é `not_allowlisted`.

`POST /api/wa/optout`
```json
{ "phone": "5562999990001", "text": "SAIR" }
```
Chamado pelo próprio worker quando chega um SAIR (ver abaixo). O site confere
o texto de novo (`isOptOutReply`) e cancela o que falta mandar pra esse número.

## SAIR (mensagens de entrada)

```
Evolution (instância ww) ──webhook MESSAGES_UPSERT, rede docker──▶ worker :8090/evolution/<WA_INBOUND_SECRET>
worker ──só um SAIR em conversa direta, HTTPS saída──────────────▶ site /api/wa/optout
```

- Nenhuma porta publicada: o listener só é alcançável dentro da rede
  `ww-evolution_default`. O segredo vai no caminho da URL; caminho errado = 404.
- Mensagem de grupo, status, newsletter e o que o próprio +1 mandou são
  descartados em memória, **sem log**. Conversa direta que não é SAIR loga só
  `{"evt":"inbound","skip":"not_sair"}` (sem número, nome ou texto), pra dar
  pra ver o webhook funcionando.
- Chat `@lid` (Evolution 2.3): o número real vem de `remoteJidAlt` ou
  `senderPn`; sem ele, `skip: no_number` e nada vai pro site.
- **`WA_MODE=live` recusa subir sem `WA_INBOUND_SECRET`.**

## Instalação no droplet (`/opt/ww-wa-worker`)

```bash
# no Mac
scp ops/ww-wa-worker/{worker.mjs,Dockerfile,docker-compose.yml,start.sh,set-webhook.sh,env.example,README.md} \
  root@198.199.83.78:/opt/ww-wa-worker/

# no droplet: .env gerado ali, token sem passar pela tela
cd /opt/ww-wa-worker
umask 077
{ echo "WA_WORKER_TOKEN=$(openssl rand -hex 32)"; grep -v '^WA_WORKER_TOKEN=' env.example; } > .env
chmod 600 .env
./start.sh
docker logs --tail 20 ww-wa-worker

# SAIR: segredo gerado ali, webhook da instância ww apontado pro worker
sed -i "s/^WA_INBOUND_SECRET=.*/WA_INBOUND_SECRET=$(openssl rand -hex 24)/" .env
./start.sh && ./set-webhook.sh        # ./set-webhook.sh --off desliga
```

`start.sh` lê a chave da Evolution de dentro do container `ww-evolution` e
passa só por variável de ambiente, como o `ww-send-kaua.sh`. Não use
`docker compose up` direto: sem a variável o compose recusa (de propósito).

Trocar de modo: editar `WA_MODE`/`WA_ALLOWLIST` no `.env` e rodar `./start.sh`.
Parar: `docker stop ww-wa-worker`.

## Testes

`npx vitest run tests/wa-worker.test.ts tests/wa-worker-inbound.test.ts` (Evolution e site falsos: dry-run não
chama `sendText`, allowlist recusa número fora, `exists:false` vira
`no_whatsapp`, 401/404/rede não derrubam o loop, log sem PII).

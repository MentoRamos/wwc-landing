#!/usr/bin/env bash
# Point the `ww` instance webhook at this worker (MESSAGES_UPSERT only), or turn
# it off. Run on ww-evolution-01, from /opt/ww-wa-worker, after ./start.sh.
#
#   ./set-webhook.sh          # on:  http://ww-wa-worker:8090/evolution/<secret>
#   ./set-webhook.sh --off    # off: SAIR stops being processed
#
# The URL carries WA_INBOUND_SECRET, so it is never echoed. The Evolution key
# is used from inside the ww-evolution container and never leaves it.
set -euo pipefail
cd "$(dirname "$0")"

enabled=true
[ "${1:-}" = "--off" ] && enabled=false

secret=$(sed -n 's/^WA_INBOUND_SECRET=//p' .env | head -1)
[ -n "$secret" ] || { echo "ERRO: falta WA_INBOUND_SECRET no .env" >&2; exit 1; }
port=$(sed -n 's/^WA_INBOUND_PORT=//p' .env | head -1)
port=${port:-8090}

body=$(printf '{"webhook":{"enabled":%s,"url":"http://ww-wa-worker:%s/evolution/%s","byEvents":false,"base64":false,"events":["MESSAGES_UPSERT"]}}' \
  "$enabled" "$port" "$secret")

# Body goes in through stdin, so the secret is not in any process list.
printf '%s' "$body" | docker exec -i ww-evolution sh -c \
  'cat > /tmp/wh.json && wget -qO /dev/null --header="apikey: $AUTHENTICATION_API_KEY" \
     --header="content-type: application/json" --post-file=/tmp/wh.json \
     http://localhost:8080/webhook/set/ww; rc=$?; rm -f /tmp/wh.json; exit $rc'

# Show the result without the URL.
docker exec ww-evolution sh -c \
  'wget -qO- --header="apikey: $AUTHENTICATION_API_KEY" http://localhost:8080/webhook/find/ww' \
  | sed -E 's#"url":"[^"]*"#"url":"(oculta)"#'
echo

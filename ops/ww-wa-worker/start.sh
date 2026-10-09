#!/usr/bin/env bash
# Build and (re)start ww-wa-worker. Run on ww-evolution-01, from /opt/ww-wa-worker.
# The Evolution key is read from the running container and passed through the
# environment only: never echoed, never written to disk by this script.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "ERRO: falta .env (ver README)" >&2; exit 1; }
[ "$(stat -c %a .env)" = 600 ] || { echo "ERRO: .env precisa de chmod 600" >&2; exit 1; }
EVOLUTION_API_KEY=$(docker inspect ww-evolution --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed -n 's/^AUTHENTICATION_API_KEY=//p' | head -1)
[ -n "$EVOLUTION_API_KEY" ] || { echo "ERRO: sem chave no container ww-evolution" >&2; exit 3; }
export EVOLUTION_API_KEY
docker compose up -d --build
docker ps --filter name=ww-wa-worker --format '{{.Names}}  {{.Status}}'

#!/usr/bin/env bash
# Marks a W&W Circle draft as approved by Kauã (called by the DM agent on "OK CIRCLE").
# Usage: circle-approve.sh [draft-id]   (default: most recent draft not yet posted)
# Today's daily draft approved before 12h waits for the 12h cron; anything else
# (late approval, test drafts) is posted right away.
set -euo pipefail

BASE="/srv/nexgen/runtime/claude-kaua/content/circle-grupo"
cd "$BASE/drafts"

id="${1:-}"
if [[ -z "$id" ]]; then
  for f in $(ls -t -- *.md 2>/dev/null); do
    cand="${f%.md}"
    [[ -f "$cand.posted" ]] || { id="$cand"; break; }
  done
fi
[[ -n "$id" && -f "$id.md" ]] || { echo "Nenhum rascunho pendente pra aprovar."; exit 0; }
[[ -f "$id.posted" ]] && { echo "Rascunho $id já foi postado."; exit 0; }

TZ=America/Sao_Paulo date -Iseconds > "$id.approved"
echo "$(TZ=America/Sao_Paulo date -Iseconds) approved $id" >> "$BASE/log.txt"

today="$(TZ=America/Sao_Paulo date +%F)"
hour="$(TZ=America/Sao_Paulo date +%H)"
if [[ "$id" == "$today" && "$hour" -lt 12 ]]; then
  echo "Aprovado ($id). Sai às 12h em Avisos."
else
  "$BASE/bin/circle-post.sh" "$id" >/dev/null && echo "Aprovado e postado agora em Avisos ($id)."
fi

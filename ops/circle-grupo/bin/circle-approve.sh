#!/usr/bin/env bash
# Marks a W&W Circle draft as approved by Kauã (called by the DM agent on "OK CIRCLE").
# Usage: circle-approve.sh [draft-id | tipo]   (default: most recent draft not yet posted)
# Dated drafts (YYYY-MM-DD-HHMM-<tipo>) approved before their slot wait for the --due cron;
# approved inside the grace window they go right away; later than that they don't go.
# Test drafts (teste-<tipo>) are posted right away.
set -euo pipefail

BASE="/srv/nexgen/runtime/claude-kaua/content/circle-grupo"
GRACE_MIN=180
export TZ=America/Sao_Paulo
cd "$BASE/drafts"

pending() { [[ ! -f "$1.posted" && ! -f "$1.expired" ]]; }

arg="$(tr '[:upper:]' '[:lower:]' <<<"${1:-}")"
[[ -z "$arg" || "$arg" =~ ^[a-z0-9-]+$ ]] || { echo "Id inválido: $arg"; exit 0; }

id=""
if [[ -n "$arg" && -f "$arg.md" ]]; then
  id="$arg"
else
  # No literal id: "promo" → newest pending dated draft of that type, then teste-promo.
  for f in $(ls -t -- *.md 2>/dev/null); do
    cand="${f%.md}"
    pending "$cand" || continue
    if [[ -z "$arg" || "$cand" == *-"$arg" ]]; then id="$cand"; break; fi
  done
fi
[[ -n "$id" && -f "$id.md" ]] || { echo "Nenhum rascunho pendente pra aprovar${arg:+ ($arg)}."; exit 0; }
[[ -f "$id.posted" ]] && { echo "Rascunho $id já foi postado."; exit 0; }

date -Iseconds > "$id.approved"
echo "$(date -Iseconds) approved $id" >> "$BASE/log.txt"

if [[ "$id" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{2})([0-9]{2})-[a-z-]+$ ]]; then
  day="${BASH_REMATCH[1]}" hh="${BASH_REMATCH[2]}" mm="${BASH_REMATCH[3]}"
  slot="$(date -d "$day $hh:$mm" +%s)"
  now="$(date +%s)"
  when="$(date -d "$day" +%d/%m) às ${hh}h${mm}"
  if (( now < slot )); then
    echo "Aprovado ($id). Sai $when em Avisos."
  elif (( now < slot + GRACE_MIN * 60 )); then
    "$BASE/bin/circle-post.sh" "$id" >/dev/null && echo "Aprovado e postado agora em Avisos ($id)."
  else
    date -Iseconds > "$id.expired"
    echo "Passou do horário ($when). Não postei $id; se quiser mesmo assim, me pede \"posta $id agora\"."
  fi
else
  "$BASE/bin/circle-post.sh" "$id" >/dev/null && echo "Aprovado e postado agora em Avisos ($id)."
fi

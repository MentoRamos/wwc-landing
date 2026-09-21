#!/usr/bin/env bash
# Posts an APPROVED W&W Circle draft to the community Announcements group.
# Usage: circle-post.sh <draft-id>        (draft-id = YYYY-MM-DD or teste-<tipo>)
#        circle-post.sh --today           (used by the 12h cron)
# A draft is only sent when drafts/<id>.approved exists and drafts/<id>.posted doesn't.
set -euo pipefail

BASE="/srv/nexgen/runtime/claude-kaua/content/circle-grupo"
OPENCLAW="/srv/nexgen/runtime/openclaw/npm/bin/openclaw"
# Only destination this script will ever send to: "W&W Circle" Announcements.
# The Conversa group (120363411128575730@g.us) is intentionally NOT here.
TARGET="120363430420458892@g.us"

id="${1:-}"
if [[ "$id" == "--today" ]]; then id="$(TZ=America/Sao_Paulo date +%F)"; fi
if [[ -z "$id" || ! "$id" =~ ^[a-z0-9-]+$ ]]; then
  echo "usage: circle-post.sh <draft-id>|--today" >&2; exit 2
fi

draft="$BASE/drafts/$id.md"
[[ -f "$draft" ]] || { echo "no draft: $id"; exit 0; }
[[ -f "$BASE/drafts/$id.posted" ]] && { echo "already posted: $id"; exit 0; }
[[ -f "$BASE/drafts/$id.approved" ]] || { echo "not approved, skipping: $id"; exit 0; }

body="$(cat "$draft")"
[[ -n "${body// /}" ]] || { echo "empty draft: $id" >&2; exit 1; }

out="$("$OPENCLAW" message send --channel whatsapp --account kaua --target "$TARGET" --message "$body" 2>&1 | grep -v '\[config\]' || true)"
echo "$out"
if grep -q "Sent via gateway" <<<"$out"; then
  TZ=America/Sao_Paulo date -Iseconds > "$BASE/drafts/$id.posted"
  echo "$(TZ=America/Sao_Paulo date -Iseconds) posted $id" >> "$BASE/log.txt"
else
  echo "$(TZ=America/Sao_Paulo date -Iseconds) FAILED $id" >> "$BASE/log.txt"
  exit 1
fi

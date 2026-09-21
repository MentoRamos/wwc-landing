#!/usr/bin/env bash
# Posts an APPROVED W&W Circle draft to the community Announcements group.
# Usage: circle-post.sh <draft-id>   (draft-id = YYYY-MM-DD-HHMM-<tipo> or teste-<tipo>)
#        circle-post.sh --due        (run every 5 min by cron: posts approved drafts whose
#                                     slot time has arrived, up to GRACE_MIN late)
# A draft is only sent when drafts/<id>.approved exists and drafts/<id>.posted doesn't.
set -euo pipefail

BASE="/srv/nexgen/runtime/claude-kaua/content/circle-grupo"
OPENCLAW="/srv/nexgen/runtime/openclaw/npm/bin/openclaw"
# Only destination this script will ever send to: "W&W Circle" Announcements.
# The Conversa group (120363411128575730@g.us) is intentionally NOT here.
TARGET="120363430420458892@g.us"
# A draft approved too late is not posted: "hoje às 20h" at 23h would be wrong.
GRACE_MIN=180
export TZ=America/Sao_Paulo

log() { echo "$(date -Iseconds) $*" >> "$BASE/log.txt"; }

# Prints the epoch of a dated draft's slot, or nothing for teste-* ids.
slot_epoch() {
  if [[ "$1" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{2})([0-9]{2})-[a-z-]+$ ]]; then
    date -d "${BASH_REMATCH[1]} ${BASH_REMATCH[2]}:${BASH_REMATCH[3]}" +%s
  fi
}

post_one() {
  local id="$1" draft="$BASE/drafts/$1.md" body out
  [[ -f "$draft" ]] || { echo "no draft: $id"; return 0; }
  [[ -f "$BASE/drafts/$id.posted" ]] && { echo "already posted: $id"; return 0; }
  [[ -f "$BASE/drafts/$id.approved" ]] || { echo "not approved, skipping: $id"; return 0; }
  body="$(cat "$draft")"
  [[ -n "${body//[[:space:]]/}" ]] || { echo "empty draft: $id" >&2; return 1; }

  out="$("$OPENCLAW" message send --channel whatsapp --account kaua --target "$TARGET" --message "$body" 2>&1 | grep -v '\[config\]' || true)"
  echo "$out"
  if grep -q "Sent via gateway" <<<"$out"; then
    date -Iseconds > "$BASE/drafts/$id.posted"
    log "posted $id"
  else
    log "FAILED $id"
    return 1
  fi
}

arg="${1:-}"
if [[ "$arg" == "--due" ]]; then
  now="$(date +%s)"
  shopt -s nullglob
  for f in "$BASE"/drafts/*.approved; do
    id="$(basename "$f" .approved)"
    [[ -f "$BASE/drafts/$id.posted" || -f "$BASE/drafts/$id.expired" ]] && continue
    slot="$(slot_epoch "$id")"
    [[ -n "$slot" ]] || continue
    if (( now >= slot && now < slot + GRACE_MIN * 60 )); then
      post_one "$id" || true
    elif (( now >= slot + GRACE_MIN * 60 )); then
      date -Iseconds > "$BASE/drafts/$id.expired"
      log "expired $id"
    fi
  done
  exit 0
fi

[[ -n "$arg" && "$arg" =~ ^[a-z0-9-]+$ ]] || { echo "usage: circle-post.sh <draft-id>|--due" >&2; exit 2; }
post_one "$arg"

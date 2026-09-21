#!/usr/bin/env bash
# Prints the draft id for a scheduled slot, so the drafting agent never computes dates itself.
# Usage: circle-slot.sh <hoje|amanha> <HHMM> <tipo>   →   2026-09-22-0730-novidade
set -euo pipefail
export TZ=America/Sao_Paulo

case "${1:-}" in
  hoje) day="$(date +%F)" ;;
  amanha) day="$(date -d tomorrow +%F)" ;;
  *) echo "usage: circle-slot.sh <hoje|amanha> <HHMM> <tipo>" >&2; exit 2 ;;
esac
[[ "${2:-}" =~ ^[0-2][0-9][0-5][0-9]$ ]] || { echo "bad HHMM: ${2:-}" >&2; exit 2; }
[[ "${3:-}" =~ ^[a-z-]+$ ]] || { echo "bad tipo: ${3:-}" >&2; exit 2; }
echo "$day-$2-$3"

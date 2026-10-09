#!/usr/bin/env bash
# A capa do canal de podcast, 2000x2000, nas fontes e nas cores da marca.
#
# Por que renderizada por script e não desenhada: capa de podcast é um ativo
# que muda (subtítulo, nome), e o Spotify guarda a URL — refazer na mão depois
# de seis meses sai diferente. Aqui o resultado é o mesmo toda vez.
#
# O Playfair Display e o Barlow Condensed são o par que o
# `wealth-wellness-DESIGN.md` nomeia como assinatura, e as cores saem do
# `globals.css`: fundo #0D0D0D, ivory #F4F2EE, ouro #C9A84C.
#
# 🔴 O espaço no fim das linhas com acento é de propósito. O drawtext deste
# ffmpeg mede o texto em BYTES e corta um caractere do fim por caractere
# multibyte presente: sem ele, "ÁUDIO" vira "ÁUDI" e "RAMOS" vira "RAMO".
#
#     bash scripts/podcast-capa.sh            # escreve public/podcast-capa.jpg
#
# Pede as duas fontes em FONT_DIR (padrão /tmp/fonts), que saem do repositório
# google/fonts: ofl/playfairdisplay/PlayfairDisplay[wght].ttf e
# ofl/barlowcondensed/BarlowCondensed-Medium.ttf.
set -euo pipefail

FONT_DIR="${FONT_DIR:-/tmp/fonts}"
OUT="${1:-public/podcast-capa.jpg}"
PF="$FONT_DIR/Playfair.ttf"
BC="$FONT_DIR/BarlowCondensed-Medium.ttf"

for font in "$PF" "$BC"; do
  [ -f "$font" ] || { echo "falta a fonte: $font" >&2; exit 2; }
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
printf 'O ARTIGO EM ÁUDIO ' > "$work/sub.txt"
printf 'KAUÃ RAMOS ' > "$work/autor.txt"

ffmpeg -hide_banner -v error -y -f lavfi -i "color=c=0x0D0D0D:s=2000x2000" -frames:v 1 \
  -vf "drawtext=fontfile=$PF:text='W E A L T H':fontcolor=0xF4F2EE:fontsize=250:x=(w-text_w)/2:y=690,\
drawtext=fontfile=$PF:text='\& W E L L N E S S':fontcolor=0xF4F2EE:fontsize=172:x=(w-text_w)/2:y=990,\
drawbox=x=(iw-300)/2:y=1300:w=300:h=4:color=0xC9A84C:t=fill,\
drawtext=fontfile=$BC:textfile=$work/sub.txt:fontcolor=0xC9A84C:fontsize=76:x=(w-text_w)/2:y=1375,\
drawtext=fontfile=$BC:textfile=$work/autor.txt:fontcolor=0x8A8782:fontsize=54:x=(w-text_w)/2:y=1780" \
  -q:v 3 "$OUT"

echo "capa em $OUT"

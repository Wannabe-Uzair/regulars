#!/usr/bin/env bash
# The home hero's clip, "the board coming alive", from scratch: HeroBoardWide (the laptop's table) and HeroBoardPhone
# (the phone's two-line rows), each rendered at 2x as PNG frames (Remotion), then encoded for the web app as H.264 MP4
# (Safari), VP9 WebM and a WebP poster of the first frame, into apps/web/public/media/. Silent, 9 s, a seamless loop.
# Run from anywhere: bash marketing/reel-remotion/build-hero.sh
set -euo pipefail
cd "$(dirname "$0")"

OUT=../../apps/web/public/media
mkdir -p out "$OUT"
[ -d node_modules ] || npm ci --no-audit --no-fund
node check-hero.ts

# sRGB frames to BT.709 video, studio range, tagged, so the card's white plays back as the page's white.
COLOUR=(-vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv)

for shape in wide phone; do
  id=HeroBoardWide
  [ "$shape" = phone ] && id=HeroBoardPhone
  frames=out/hero-$shape
  rm -rf "$frames"
  npx remotion render src/index.ts "$id" "$frames" --sequence --image-format=png --scale=2 --log=error
  first=$(ls "$frames"/*.png | head -1)
  last=$(ls "$frames"/*.png | tail -1)
  # The loop is seamless: its last frame is its first.
  cmp -s "$first" "$last" || { echo "$id: the last frame is not the first" >&2; exit 1; }
  # One keyframe per loop: the picture barely changes, so the clip stays small.
  ffmpeg -hide_banner -loglevel error -y -framerate 30 -pattern_type glob -i "$frames/*.png" "${COLOUR[@]}" \
    -c:v libx264 -preset slow -crf 16 -tune animation -g 270 -an -movflags +faststart "$OUT/hero-board-$shape.mp4"
  ffmpeg -hide_banner -loglevel error -y -framerate 30 -pattern_type glob -i "$frames/*.png" "${COLOUR[@]}" \
    -c:v libvpx-vp9 -crf 24 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -g 270 -an "$OUT/hero-board-$shape.webm"
  ffmpeg -hide_banner -loglevel error -y -i "$first" -c:v libwebp -lossless 1 -compression_level 6 \
    "$OUT/hero-board-$shape.webp"
done

for f in "$OUT"/hero-board-*.mp4 "$OUT"/hero-board-*.webm; do
  ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate:format=duration \
    -of csv=p=0 "$f" | tr '\n' ' '
  echo " $f"
done
ls -l "$OUT"/hero-board-*

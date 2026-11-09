#!/usr/bin/env bash
# Rebuilds the Tenure reel picture from scratch: FFV1 intermediate, silent H.264 export, poster, contact sheet.
# Runnable from any directory.  SUB=1 bash reel/build-video.sh gives a fast 1-sub-frame draft (default 4).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SUB="${SUB:-4}"
MKV="$ROOT/build/reel/reel.mkv"
OUT="$ROOT/exports/Tenure-reel-16x9-silent.mp4"
mkdir -p "$ROOT/build/reel" "$ROOT/exports"
rm -f "$MKV"

# 1. lossless 16-bit intermediate: 30 fps, 1920 x 1080, 30.0 s, 4 sub-frames at a 180° shutter
node "$ROOT/reel/render.mjs" 30 "$SUB" "$MKV" 0 30

# 2. silent export: one dithered BT.709 conversion, H.264 High, yuv420p, grain tune keeps the speckle and flat rubber clean
ffmpeg -y -v error -i "$MKV" -an \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv" \
  -c:v libx264 -profile:v high -preset slow -crf 16 -tune grain -x264-params "aq-mode=3" \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r 30 -movflags +faststart "$OUT"

# 3. poster: the end card at t = 29.5, captured straight from the page
node "$ROOT/reel/stills.mjs" "$ROOT/build/reel/poster" 29.5
cp "$ROOT/build/reel/poster/t29.50.png" "$ROOT/exports/Tenure-reel-poster.png"

# 4. contact sheet: frames at 0, 1, ... 29 s, 320 px wide, 6 x 5, in time order
ffmpeg -y -v error -i "$MKV" -vf "select='not(mod(n\,30))',scale=320:180:flags=lanczos,format=rgb24,tile=6x5" -frames:v 1 -update 1 "$ROOT/reel/contact-sheet.png"

ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt -show_entries format=duration -of compact "$OUT"

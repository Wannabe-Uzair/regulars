#!/usr/bin/env bash
# Rebuilds the whole Tenure reel, runnable from any directory:
#   1. build-audio.sh  -> reel/soundtrack.wav (synthesised from cues.js) and the sync check
#   2. build-video.sh  -> exports/Tenure-reel-16x9-silent.mp4, exports/Tenure-reel-poster.png, reel/contact-sheet.png
#   3. this script     -> exports/Tenure-reel-16x9.mp4 (the silent picture, copied as is, plus the soundtrack as AAC)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"

bash "$HERE/build-audio.sh"
bash "$HERE/build-video.sh"

ffmpeg -y -loglevel error \
  -i "$ROOT/exports/Tenure-reel-16x9-silent.mp4" -i "$HERE/soundtrack.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -shortest -movflags +faststart "$ROOT/exports/Tenure-reel-16x9.mp4"

ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -show_entries format=duration -of compact "$ROOT/exports/Tenure-reel-16x9.mp4"

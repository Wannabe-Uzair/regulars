#!/usr/bin/env bash
# The Regulars reel, from scratch: the two pictures (Remotion, muted), the two soundtracks and the SRT (mix.ts, ffmpeg),
# then the five outputs in marketing/exports. Run from anywhere: bash marketing/reel-remotion/build.sh
set -euo pipefail
cd "$(dirname "$0")"

OUT=../exports
mkdir -p out "$OUT"
[ -d node_modules ] || npm ci --no-audit --no-fund

# The pictures, silent: the sound is mixed apart so the 16:9 film and its loop share one render.
npx remotion render src/index.ts Reel16x9 out/wide.mp4 --muted --log=error
npx remotion render src/index.ts Reel9x16 out/tall.mp4 --muted --log=error

# The posters: the end card's still (it holds from 29.4 s).
npx remotion still src/index.ts Reel16x9 "$OUT/Regulars-reel-poster-16x9.png" --frame=891 --log=error
npx remotion still src/index.ts Reel9x16 "$OUT/Regulars-reel-poster-9x16.png" --frame=891 --log=error

# The soundtracks (-14 LUFS, true peak under -1 dBTP) and the subtitles.
node mix.ts

# Picture and sound together: H.264 as rendered, AAC at 256 kb/s, 30.0 s.
mux() {
  ffmpeg -hide_banner -loglevel error -y -i "$1" -i "$2" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k \
    -t 30 -movflags +faststart "$3"
}
mux out/wide.mp4 out/mix-voice.wav "$OUT/Regulars-reel-16x9.mp4"
mux out/wide.mp4 out/mix-loop.wav "$OUT/Regulars-reel-16x9-loop.mp4"
mux out/tall.mp4 out/mix-voice.wav "$OUT/Regulars-reel-9x16.mp4"

for f in "$OUT"/Regulars-reel-16x9.mp4 "$OUT"/Regulars-reel-16x9-loop.mp4 "$OUT"/Regulars-reel-9x16.mp4; do
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 "$f" |
    tr '\n' ' '
  echo " $f"
done
ls -l "$OUT"/Regulars-reel*

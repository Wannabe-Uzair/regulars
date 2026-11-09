#!/usr/bin/env bash
# The whole deck again from the app as it is now, in one command: the captures (capture.mjs, through its write guard),
# then the PDF, the picture .pptx and the previews (build.sh), then the checks (present mode, with the reel step after
# slide 3 when exports/ holds the film, and the figures).
#   bash marketing/slides/rebuild.sh <capture server url>      e.g. bash marketing/slides/rebuild.sh http://127.0.0.1:5341
# The capture server is a stall-mode server on a freshly seeded database (the brief: kit-stage.md, "The captures"),
# started and stopped by whoever runs this. Stops at the first step that fails.
set -euo pipefail
if [ $# -ne 1 ]; then
  echo "usage: rebuild.sh <capture server url>" >&2
  exit 2
fi
S="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T="$(dirname "$S")"

node "$S/capture.mjs" "$1" "$S/shots"
bash "$S/build.sh"
pdfinfo "$T/exports/Regulars-pitch.pdf" | grep -E '^(Title|Pages)'
node "$S/present-check.mjs"
node "$S/figures-check.mjs" "$T/exports/Regulars-pitch.pdf"

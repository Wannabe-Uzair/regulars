#!/usr/bin/env bash
# Rebuild the Tenure reel soundtrack and SFX stem, then check the stem against cues.js. Runnable from any directory.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$HERE/synth.mjs"
node "$HERE/sync-check.mjs"

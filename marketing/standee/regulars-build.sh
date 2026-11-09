#!/usr/bin/env bash
# Rebuilds the Regulars standee from standee/regulars.html. Runnable from any directory.
#   exports/Regulars-standee-2x5ft.pdf          24 x 60 in, vector, fonts embedded
#   exports/Regulars-standee-2x5ft-150dpi.jpg   3600 x 9000 px tagged 150 dpi (opens at 24 x 60 in), sRGB, JPEG quality 92
#   standee/regulars-preview.png, standee/regulars-preview-guides.png   about 900 px tall
# Scratch renders go to build/standee/ (git-ignored). The old Tenure files are left as they are.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PDF="exports/Regulars-standee-2x5ft.pdf"
JPG="exports/Regulars-standee-2x5ft-150dpi.jpg"
BUILD="build/standee"
BIG="$BUILD/regulars-standee-150dpi.png"
GUIDES="$BUILD/regulars-standee-guides.png"
SRGB="/System/Library/ColorSync/Profiles/sRGB Profile.icc"

mkdir -p "$BUILD" exports
rm -f "$PDF" "$JPG" "$BIG" "$GUIDES" standee/regulars-preview.png standee/regulars-preview-guides.png

# 1. print PDF (page size from the page's @page rule)
node tools/render-regulars.mjs pdf standee/regulars.html "$PDF"

# 2. 150 dpi JPG: 24 in = 2304 CSS px; x 1.5625 = 3600 px
node tools/render-regulars.mjs png standee/regulars.html "$BIG" 2304 5760 1.5625
sips -s format jpeg -s formatOptions 92 -s dpiWidth 150 -s dpiHeight 150 --embedProfile "$SRGB" "$BIG" --out "$JPG" >/dev/null

# 3. previews, about 900 px tall
sips -Z 900 "$BIG" --out standee/regulars-preview.png >/dev/null
node tools/render-regulars.mjs png "standee/regulars.html?guides=1" "$GUIDES" 2304 5760 0.5
sips -Z 900 "$GUIDES" --out standee/regulars-preview-guides.png >/dev/null

echo "standee: $PDF, $JPG, standee/regulars-preview.png, standee/regulars-preview-guides.png"

#!/usr/bin/env bash
# Rebuilds the Tenure brochure exports from brochure.html. Runnable from any directory.
#   exports/Tenure-brochure-A4-trifold-print.pdf  2 pages, 303 x 216 mm (A4 landscape + 3 mm bleed), no guides
#   exports/Tenure-brochure-proof.pdf             the same pages with trim, folds, 8 mm safe areas and panel names
#   brochure/preview-outside.png, preview-inside.png   150 dpi renders of the print PDF, bleed cropped (297 x 210 mm)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
PRINT="exports/Tenure-brochure-A4-trifold-print.pdf"
PROOF="exports/Tenure-brochure-proof.pdf"
mkdir -p exports build/brochure
rm -f "$PRINT" "$PROOF" brochure/preview-outside.png brochure/preview-inside.png

node tools/render.mjs pdf brochure/brochure.html "$PRINT"
node tools/render.mjs pdf "brochure/brochure.html?guides=1" "$PROOF"

# 150 dpi: 3 mm bleed = 17.7 px, trim 297 x 210 mm = 1754 x 1240 px
pdftoppm -r 150 -png -x 18 -y 18 -W 1754 -H 1240 "$PRINT" build/brochure/preview
mv build/brochure/preview-1.png brochure/preview-outside.png
mv build/brochure/preview-2.png brochure/preview-inside.png

pdfinfo "$PRINT" | grep -E '^Pages|Page size'

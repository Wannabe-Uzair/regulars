#!/usr/bin/env bash
# Rebuilds the stall's visitor-answers sheet from stall/visitor-answers.html. Runnable from any directory.
#   exports/Regulars-visitor-answers-A4.pdf   1 page, A4 portrait 210 x 297 mm (595.28 x 841.89 pt), no bleed (office printer), fonts embedded
#   exports/Regulars-visitor-answers-A4.png   150 dpi render of that PDF, 1240 x 1754 px
# Fails if the page's layout check finds a box past its margins (a console error fails the render), if the sheet runs
# onto a second page, or if any line of VISITOR-QA.md is missing from the PDF text.
# Needs Google Chrome and poppler (pdfinfo, pdftotext, pdftoppm). The old Tenure files are left as they are.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
PDF="exports/Regulars-visitor-answers-A4.pdf"
PNG="exports/Regulars-visitor-answers-A4.png"
mkdir -p exports build/stall
rm -f "$PDF" "$PNG" build/stall/preview.png

node tools/render-regulars.mjs pdf stall/visitor-answers.html "$PDF"
node stall/fix-a4.mjs "$PDF"

PAGES="$(pdfinfo "$PDF" | awk '/^Pages:/ {print $2}')"
if [ "$PAGES" != "1" ]; then echo "visitor answers: $PAGES pages, expected 1 (the content overflows A4)" >&2; exit 1; fi
node stall/check.mjs "$PDF"

pdftoppm -r 150 -png -singlefile "$PDF" build/stall/preview
mv build/stall/preview.png "$PNG"

pdfinfo "$PDF" | grep -E '^Pages|Page size'
echo "visitor answers: $PDF, $PNG"

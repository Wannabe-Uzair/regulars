#!/usr/bin/env bash
# Rebuilds the Regulars brochure exports from brochure/regulars.html. Runnable from any directory.
#   exports/Regulars-brochure-A4-trifold-print.pdf  2 pages, 303 x 216 mm (A4 landscape + 3 mm bleed), no guides
#   exports/Regulars-brochure-proof.pdf             the same pages with trim, folds, 8 mm safe areas and panel names
#   brochure/regulars-preview-outside.png, regulars-preview-inside.png   150 dpi renders of the print PDF, bleed cropped
# The print-safe backups, for a print shop whose preflight refuses the Type 3 fonts Chrome embeds for the variable face
# (each is the print PDF as pictures, bleed included, sRGB, JPEG quality 92):
#   exports/Regulars-brochure-A4-trifold-side1-300dpi.jpg, -side2-300dpi.jpg   3579 x 2550 px at 300 dpi
#   exports/Regulars-brochure-A4-trifold-print-600dpi-images.pdf               2 pages, 303 x 216 mm, 600 dpi, no fonts
# Needs Google Chrome, poppler (pdftoppm, pdfinfo, pdfunite) and sips. The old Tenure files are left as they are.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
cd "$ROOT"
PRINT="exports/Regulars-brochure-A4-trifold-print.pdf"
PROOF="exports/Regulars-brochure-proof.pdf"
SIDE="exports/Regulars-brochure-A4-trifold-side"
IMAGES="exports/Regulars-brochure-A4-trifold-print-600dpi-images.pdf"
B="build/brochure"
SRGB="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
mkdir -p exports "$B"
rm -f "$PRINT" "$PROOF" "$SIDE"1-300dpi.jpg "$SIDE"2-300dpi.jpg "$IMAGES" brochure/regulars-preview-outside.png brochure/regulars-preview-inside.png
rm -f "$B"/regulars-300-1.png "$B"/regulars-300-2.png "$B"/regulars-600-1.png "$B"/regulars-600-2.png
rm -f "$B"/regulars-600-1.jpg "$B"/regulars-600-2.jpg "$B"/regulars-600-1.pdf "$B"/regulars-600-2.pdf

node tools/render-regulars.mjs pdf brochure/regulars.html "$PRINT"
node tools/render-regulars.mjs pdf "brochure/regulars.html?guides=1" "$PROOF"

# 150 dpi: 3 mm bleed = 17.7 px, trim 297 x 210 mm = 1754 x 1240 px
pdftoppm -q -r 150 -png -x 18 -y 18 -W 1754 -H 1240 "$PRINT" "$B"/regulars-preview
mv "$B"/regulars-preview-1.png brochure/regulars-preview-outside.png
mv "$B"/regulars-preview-2.png brochure/regulars-preview-inside.png

# the print-safe backups: the print PDF as pictures, side 1 the outside, side 2 the inside
pdftoppm -q -r 300 -png "$PRINT" "$B"/regulars-300
pdftoppm -q -r 600 -png "$PRINT" "$B"/regulars-600
for n in 1 2; do
  sips -s format jpeg -s formatOptions 92 -s dpiWidth 300 -s dpiHeight 300 --embedProfile "$SRGB" "$B/regulars-300-$n.png" --out "$SIDE$n-300dpi.jpg" >/dev/null
  sips -s format jpeg -s formatOptions 92 -s dpiWidth 600 -s dpiHeight 600 --embedProfile "$SRGB" "$B/regulars-600-$n.png" --out "$B/regulars-600-$n.jpg" >/dev/null
  sips -s format pdf "$B/regulars-600-$n.jpg" --out "$B/regulars-600-$n.pdf" >/dev/null
done
pdfunite "$B"/regulars-600-1.pdf "$B"/regulars-600-2.pdf "$IMAGES"

pdfinfo "$PRINT" | grep -E '^Pages|Page size'

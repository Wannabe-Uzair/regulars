#!/usr/bin/env bash
# Rebuilds the Regulars pitch from slides/slides.html: the PDF (its title, "Regulars pitch", comes from the page's
# <title>), the picture deck and the previews. Runs from any directory. Needs Node, Google Chrome and poppler
# (pdftoppm), and slides/node_modules (pptxgenjs: cd slides && npm ci --ignore-scripts).
set -euo pipefail
T="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
B="$T/build/slides"

cd "$T"
# 1. PDF (the exact look); the page reports any layout overflow as a console error, which fails the render
node tools/render-regulars.mjs pdf slides/slides.html exports/Regulars-pitch.pdf

# 2. the picture deck: exact PDF pages as 1920 x 1080 images (96 dpi on 1440 x 810 pt pages), the speaker notes, no
#    fonts needed
rm -rf "$B/pages" && mkdir -p "$B/pages"
pdftoppm -r 96 -png exports/Regulars-pitch.pdf "$B/pages/slide"
for f in "$B"/pages/slide-0*.png; do [ -e "$f" ] && mv "$f" "${f/slide-0/slide-}"; done
(cd slides && NODE_PATH="$T/slides/node_modules" node make-image-pptx.cjs "$B/pages" notes.md "$T/exports/Regulars-pitch-picture-slides.pptx")

# 3. previews, 960 x 540, from the PDF
P="$T/slides/previews"
rm -rf "$P" && mkdir -p "$P"
pdftoppm -r 48 -png exports/Regulars-pitch.pdf "$P/slide"
for f in "$P"/slide-0*.png; do [ -e "$f" ] && mv "$f" "${f/slide-0/slide-}"; done
echo "built: exports/Regulars-pitch.pdf, exports/Regulars-pitch-picture-slides.pptx, slides/previews/"

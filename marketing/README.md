# Tenure — expo kit

Four pieces for the startup expo, all built from one saved design code:

| Piece | Source | Finished files (in `exports/`) |
| --- | --- | --- |
| Design code | `brand/` | `Tenure-design-code.pdf` / `.png` (the one-page style sheet) |
| A4 tri-fold brochure | `brochure/` | `Tenure-brochure-A4-trifold-print.pdf`, `Tenure-brochure-proof.pdf` |
| 2 × 5 ft standee | `standee/` | `Tenure-standee-2x5ft.pdf`, `Tenure-standee-2x5ft-150dpi.jpg` |
| Pitch deck, 8 slides | `slides/` | present live from `slides/slides.html?present` in Chrome; backups `Regulars-pitch.pdf` and `Regulars-pitch-picture-slides.pptx` (exact pictures + notes, works anywhere); new screens: `bash slides/rebuild.sh <capture server url>` |
| 30 s reel (Remotion) | `reel-remotion/` | `Regulars-reel-16x9.mp4` (with voice), `Regulars-reel-16x9-loop.mp4` (the stall's loop, no voice), `Regulars-reel-9x16.mp4`, `Regulars-reel-poster-16x9.png`, `Regulars-reel-poster-9x16.png`, `Regulars-reel.srt` |
| Visitor answers, A4 (for the team, not a handout) | `stall/` | `Tenure-visitor-answers-A4.pdf` (print on one A4 sheet), `Tenure-visitor-answers-A4.png` (preview); rebuild with `bash stall/build.sh` |

Before the stall, read `VISITOR-QA.md`: short spoken answers to the questions visitors ask.

## The Regulars brochure and standee (7 Nov, the new name and design)

The brochure and the standee are redone in the new brand: the name Regulars, the Quarter mark, Inter and the Iris
palette, all in `brand/regulars/` (read its `README.md`). They print from these files; the Tenure files above stay as
they were.

| Piece | Source | Finished files (in `exports/`) |
| --- | --- | --- |
| A4 tri-fold brochure | `brochure/regulars.html` | `Regulars-brochure-A4-trifold-print.pdf`, `Regulars-brochure-proof.pdf` (with trim, folds and safe areas); print-safe pictures of the print PDF, no fonts: `Regulars-brochure-A4-trifold-print-600dpi-images.pdf`, `Regulars-brochure-A4-trifold-side1-300dpi.jpg`, `-side2-300dpi.jpg`; previews `brochure/regulars-preview-outside.png`, `regulars-preview-inside.png` |
| 2 × 5 ft standee | `standee/regulars.html` | `Regulars-standee-2x5ft.pdf`, `Regulars-standee-2x5ft-150dpi.jpg`; previews `standee/regulars-preview.png`, `regulars-preview-guides.png` |

```bash
bash brochure/regulars-build.sh && node brochure/regulars-check.mjs
bash standee/regulars-build.sh && node standee/regulars-check.mjs
```

They need Google Chrome and poppler, and render through the repository's own `playwright-core`
(`tools/render-regulars.mjs`), so `tools/` needs no `npm install` for them. Same formats as before: the brochure is A4
landscape with 3 mm bleed, double-sided, roll fold; the standee is 24 × 60 in, nothing but white in the bottom 3 in.
Send the shop `exports/Regulars-PRINT-NOTE.md` with the files: which file to send, sides, trim, fold, and the colour
proof (the tint #5444E4 can print duller in CMYK).

**Start with `brand/DESIGN.md`.** It holds the rules (colour, type, logo, devices, layout, motion), the approved words
with their sources, the content of each piece and the checklist every piece must pass. Values live in
`brand/tokens.json`; the shared graphics (logo, floor tape, hazard tape, plate, the 90-day board) are drawn by
`brand/kit.js`, so every piece draws them the same way.

## Rebuilding

Needs Node, Google Chrome, ffmpeg and poppler (`brew install ffmpeg poppler`).

```bash
cd tenure/tools && npm install          # puppeteer-core, gsap, opentype.js
node tools/make-assets.mjs              # from tenure/: after changing tokens.json or the fonts
bash brochure/build.sh
bash standee/build.sh
bash slides/build.sh
bash reel/build.sh                      # the slowest: renders every frame, then encodes
```

Changing a colour or size in `brand/tokens.json`, then running `make-assets` and the four builds, updates every piece together.

## Printing notes

- Brochure: A4, double-sided, roll fold (the 97 mm panel folds in first). The PDF has 3 mm bleed on every side. Ask
  the printer for rich black on the large black areas.
- Standee: 24 × 60 in. Send the PDF (vector) or the 150 dpi JPG. The bottom 9 in sit in or near the stand's base.
- Brochure and standee PDFs contain live transparency (the faint rubber-floor speckle). Most print shops flatten it
  automatically; if one asks, say "PDF 1.4 with transparency, please flatten". The JPG has nothing to flatten.
- Slides: present from `slides/slides.html?present` in Chrome, full screen; the backup is `Regulars-pitch.pdf`, or
  `Regulars-pitch-picture-slides.pptx` if a PowerPoint file is required.

Fonts: Anton, Barlow and Barlow Condensed, SIL Open Font License (licences in `brand/fonts/`).
Screens show sample data. "Tenure" is a working name and has not been legally cleared.

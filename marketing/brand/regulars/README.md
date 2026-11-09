# Regulars: the print kit's brand

The brochure (`brochure/regulars.html`) and the standee (`standee/regulars.html`) draw from these files. The old kit
beside this folder (`brand/DESIGN.md`, Barlow, Anton, the chalk and rubber assets) stays for the slides and the reel
until they are redone.

| File | What it is |
| --- | --- |
| `fonts/InterVariable.woff2`, `fonts/LICENSE.txt` | Inter 4.1, the one face, with optical sizes (SIL Open Font License) |
| `tokens.css` | the @font-face, the Iris palette (light only) and the shared print classes |
| `regulars.js` | the Quarter mark, the lockup, the week marks, the board picture and the 90-day grids |
| `quarter.svg` | the Quarter symbol on its 24-unit grid: the quarter in the text colour, the square in the tint |

## Rules

- **Name:** Regulars, a plural noun naming one product. No sentence makes it the subject of a singular verb ("With
  Regulars, you see…", never "Regulars shows…"), and no status or count is called "regulars". Internal names stay
  "tenure".
- **Lockup:** the Quarter beside "Regulars" in title case, Inter 600, tracked -0.01em; once per surface (the brochure's
  two covers each count as one).
- **Type:** Inter only, weights 400, 600 and 700, `font-optical-sizing: auto`, tabular figures for data, sentence case,
  no spaced capitals.
- **Colour:** white paper; the app's ground #F2F2F7 only behind the board picture and grouped lists. Text #1D1D1F,
  secondary #606068, hairlines #D1D1D6, control edges #8C8C8D. One tint, #5444E4, for what you can act on (the Nudge
  capsule, on #EAE9FC) and the mark's square. Red only for Slipping: its triangle (#E0102E), its word (#D40624) and the
  slipping weeks' edge. No green and no amber.
- **Status:** a mark and a word, the shape telling them apart: a filled dot for On the line, a ring with its left half
  filled for Below the line, an empty ring (text-soft) for New, a falling triangle for Slipping. On the line, Below the
  line and New are in the text colour; only Slipping is red. Drawn as inline SVG sized in em (`REGULARS.status`).
- **The board picture:** white card on the ground, a member's name and status (mark and word), 13 rounded week marks
  in the app's light week colours (3+ visits in the text colour, 1 or 2 in #929294, a #929294 outline for none, a
  slipping week's red edge, weeks not reached in #EDEDED), a Nudge capsule on slipping rows, and always the Sample data
  tag.
- **Capitals:** Apple's split. Title Case only on a button's words shown in a picture; the one-word "Nudge" capsule,
  the status words, the tags and every sentence and label stay in sentence case.
- **Words:** no QR codes, contact details, website or launch date. The product never sends anything: one tap opens a
  text, ready to send.
- **Print:** `exports/Regulars-PRINT-NOTE.md` is the note for the shop. Ask for a colour proof; #5444E4 can print
  duller in CMYK. Chrome embeds a variable font as Type 3 outlines (vector, sharp at any size); if a shop's preflight
  refuses Type 3, send the brochure's 600 dpi image PDF or its two 300 dpi JPGs, and the standee's JPG.

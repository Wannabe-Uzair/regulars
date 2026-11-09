# Tenure — design code (v1.0, "Gym floor")

This file is the single reference for every Tenure piece: the brochure, the standee, the slides and the reel.
Build each piece from it, and check each piece against §11 before calling it done. If a piece needs something
this file does not cover, add it here first and then use it, so the next piece gets it too.

The code has four parts that must agree:

| File | What it holds |
| --- | --- |
| `brand/DESIGN.md` | The rules and the approved words (this file) |
| `brand/tokens.json` | Every value: colours, fonts, type sizes, margins, motion timings. The source of truth |
| `brand/tokens.css` (+ generated `tokens.vars.css`) | The same values as CSS, the `@font-face` rules and the base classes. Every HTML piece links it first |
| `brand/kit.js` (+ generated `wordmark.js`) | The shared graphic devices as functions returning SVG: `logo`, `tape`, `hazard`, `plate`, `board`, `legend`, `days`, and the shared sample data |

`brand/style-sheet.html` shows all of it on one page (rendered to `exports/Tenure-design-code.pdf`).
`tools/make-assets.mjs` regenerates the generated files after a change to `tokens.json` or the fonts.
`tools/render.mjs` turns any page into a PDF or PNG with the brand fonts loaded.

---

## 1. The brand

**Tenure** is a member-retention dashboard for **US independent gyms**. It watches every new member's first
90 days, flags anyone who drops below three visits a week, and lets the owner or a coach nudge them back with
one tap. The audience is **gym owners**. There is no member app.

The pieces are for a **university startup expo**: a stall with a 2 × 5 ft standee, a tri-fold brochure to hand out,
a 3-minute pitch with 8 slides, and a 30-second reel looping on a screen. They are **for display only**: Tenure is
not launching, so there are **no QR codes, no contact details, no website, no launch date**.

The look, "Gym floor", borrows the language of the gym itself: black rubber flooring, chalk, safety-yellow floor
tape, hazard tape, weight plates and stencil numbers. It should feel like it belongs on a gym wall, and like a
tool an owner can trust with money.

## 2. Voice and the approved words

**The voice: calm, exact, sure.** Tenure speaks like a serious software company that knows the gym floor.
The type is loud; the words are not. Anton and the yellow carry the volume, the sentences stay level.

Rules. Each "after" shows the rule; it becomes an approved line only once it is picked (`copy/PICKS.md`).

1. **One idea per line**, readable in two seconds from three metres. "They rarely quit on day one. They fade: one missed week, then two, then a cancellation." → "They rarely quit on day one. They fade, one missed week at a time."
2. **Concrete words**: members, visits, weeks, day 90, $99. "MEMBER RETENTION" stays the category name; it is never a sentence's subject. "lets you nudge them back" → "lets you text them before they're gone".
3. **State, don't shout.** Declarative sentences with full stops. A question only when it does work (NEW HERE? JOIN, a nudge asking for a reply). "So who stays?" → "Here is who stays."
4. **Numbers carry the weight**, always as numerals. "Three visits a week is the line" → "3 visits a week is the line." "Keep two members a month" → "Keep 2 members a month".
5. **Understate.** No superlatives, intensifiers or hype; let the fact sit. "That gap is the whole idea." → "Tenure is built on that gap."
6. **Write for the owner's outcome** (members who stay, a full floor), not the software's features. "Every check-in from a new member's first 90 days, on one board." → "Every new member's check-ins, on one board, for 90 days."
7. **Calm is not soft.** Active verbs, short sentences, no hedging. "while you can still win them back" → "while there is still time."
8. **Exact over clever.** Say what the button does and what the number means. "MARK AS SENT" on an in-person nudge → "RECORD NUDGE". "CHOOSE THE $99 PLAN" (there is one plan) → "CONTINUE AT $99 A MONTH".
9. **The product's words are fixed terms**: nudge, slipping, the line, on the line, new. Use them the same way everywhere; never swap in a synonym for variety. "Two weak weeks in a row and they're flagged" → "Two weak weeks in a row and they show as slipping."
10. **Read it aloud** as a calm professional at the stall would say it. If it sounds like an advert, cut it back. "Hi, we're Tenure." → "We're Tenure."

**Banned words**: revolutionary, game-changer, seamless, effortless, supercharge, unlock, empower, leverage, crush, best-in-class,
AI-powered, journey, engagement (as a noun for visits), simply, just, very, really, amazing, powerful, ultimate, never miss,
and any exclamation mark or emoji. Also no emojis, icons, stock photos, photos of people, device mock-ups or clip art.

**Spelling**: US spelling (the market is US): "color", "canceled", "cancellation". (Code comments may vary.) Never split a number
from the word it counts.

**One line per surface**

| Surface | How it reads |
| --- | --- |
| Print headline | Anton caps, one idea, ideally 7 words or fewer, ends with a full stop; a number leads where there is one |
| Slide | One big line per slide; the speaker says the rest |
| Reel card | 2–5 words per card, on screen at least 0.75 s per 3 words; the card states, the next card answers |
| App title or label | A noun in caps: what is on the screen (TODAY, THE BOARD, SLIPPING NOW), no verbs, no full stop |
| Button | Verb first, caps, says exactly what happens (RECORD NUDGE, IMPORT MEMBERS); one primary per region |
| Empty state | Caps title states the fact (NO NUDGES YET); one sentence says how it fills; one button |
| Toast | What just happened, past tense, no full stop, no praise ("Nudge to Sam recorded") |
| Error | What happened, then what to do, in two short sentences; never blame the user ("Can't reach Tenure. Check your connection and try again.") |
| Kiosk | Member-facing: short, warm, numbers ("WELCOME BACK, SAM. WEEK 4."); no Tenure jargon beyond ON THE LINE |
| SMS nudge | The coach's own voice, first person, first name, one question that is easy to answer, signed; no brand words, no guilt, no links |
| Spoken line | Plain sentences at a calm pace; say the source with the number; one pause per idea |

### Approved lines — use these words; do not invent new claims

The picks and each surface's line breaks are in `copy/CHOSEN.md` and `copy/PICKS.md` ("Other surfaces"). Yellow words follow §4.

| Use | Line |
| --- | --- |
| Tagline | KEEP NEW MEMBERS PAST DAY 90. ("DAY 90." yellow) |
| Hero split (cover, standee) | DAY 90 / GET EVERY NEW MEMBER THERE. |
| Descriptor (in the lockup) | MEMBER RETENTION FOR INDEPENDENT GYMS |
| Problem | 6 IN 10 NEW MEMBERS QUIT WITHIN THREE MONTHS. (always with its source, Sperandei et al., 2016) |
| Problem, supporting | They rarely quit on day one. They fade, one missed week at a time. |
| The line | MEMBERS WHO STAY HIT 3 VISITS A WEEK. |
| The line, numbers | 78% of members at 3+ visits a week renew. Under once a week: 59%. |
| Section labels | 01 — THE PROBLEM · 02 — THE LINE · 03 — TENURE · 04 — HOW IT WORKS · 05 — THE MARKET |
| Product headline | ONE BOARD FOR EVERY NEW MEMBER'S FIRST 90 DAYS. (under the label 03 — TENURE) |
| Product sentence | Tenure watches every new member's first 90 days, flags anyone who drops below the line, and lets you nudge them back in one tap. |
| Step 1 | TRACK — Every new member's check-ins, on one board, for 90 days. |
| Step 2 | FLAG — Two weak weeks in a row and they're flagged, while there is still time. |
| Step 3 | NUDGE — One tap opens a personal text from you or their coach, ready to send. (the product never sends anything) |
| Step numbers | When the steps are numbered, the numbers are 01, 02, 03 (label type, yellow) |
| Contrast | Most gym software shows who canceled. Tenure shows who's slipping. |
| Price | The plan we'd test: a free 90-day pilot, then $99 a month per gym. Not on sale yet. (S5, 7 Nov) |
| Price, supporting | One flat price per gym. Unlimited members. |
| Payback | Keep 2 members a month, and from the second month it pays for itself. (Uzair, 7 Nov) |
| Market | 55,294 US gyms and studios. |
| Market math (slides only) | $99 × 12 = $1,188 a year per gym. 1% of US gyms ≈ 553 gyms ≈ $657,000 a year. |
| Sign-off | MEMBERS WHO STAY. (all yellow, set under the logo, which stands for "TENURE.") |
| Team (names only, this order) | Uzair Imran · Moiz Hamid · Zain ul Abideen · Ali Hassan — always in mixed case exactly as written ("ul" stays lower case), never in capitals |

**Sample nudge message** (always tagged SAMPLE MESSAGE): "Hey Sam, we missed you this week. Want me to save you a
spot in Thursday's 6 pm class? — Coach Mike"

### Statistics and their sources — print the source in small type next to the number, every time

| Number | Source line to print |
| --- | --- |
| 63% of new members quit within three months (shown as "6 in 10") | Sperandei et al., 2016 |
| 78% renew at 3+ visits a week; 59% under once a week | IHRSA |
| Most US members pay under $50 a month (basis for the payback line) | Health & Fitness Association, 2024 |
| 55,294 US gyms and studios | 2024 U.S. Health & Fitness Consumer Report |

### Honesty rules

- Every dashboard or board visual carries the **SAMPLE DATA** tag. Names on it are the shared sample members in `kit.js`.
- No testimonials, user counts, "trusted by", partner logos, real gym names, vendor names or awards.
- No claim that Tenure itself improves retention: it is untested. The numbers above describe gyms, not Tenure.
- No roles, titles, school or course names next to the team names.

## 3. Colour

| Token | Hex | Role | Print |
| --- | --- | --- | --- |
| `rubber` | `#141414` | Ground. 70–85% of every surface | Rich black 60/40/40/100 for large areas; 0/0/0/100 for small text |
| `rubber2` | `#1F1F1F` | Raised panels on rubber: screens, cards | — |
| `rubber3` | `#2B2B2B` | Empty board cells, hairlines, grid lines | — |
| `chalk` | `#EDEBE6` | Main text and line work on rubber | — |
| `steel` | `#8C9098` | Secondary text, labels, sources; weeks with 1–2 visits | — |
| `yellow` | `#FFD60A` | The one accent: floor tape, hazard tape, key numbers, weeks on the line. 5–12% of a surface | 0/15/100/0 |
| `red` | `#FF4B3E` | **Only** the slipping state. One red group per surface (a brochure panel is a surface), under 3% of it | 0/80/75/0 |

CSS variables: `--rubber`, `--rubber2`, `--rubber3`, `--chalk`, `--steel`, `--yellow`, `--red` (`--rubber-2` and `--rubber-3` exist as aliases).

Rules:
- The ground is rubber. The one exception is the **yellow "sign" surface**: one per piece at most (the brochure's
  back cover, the slides' price slide, the reel's price beat). On yellow, everything is rubber.
- Yellow text only on rubber. Chalk is never a ground (no light versions of any piece).
  One exception: a team-only working sheet that visitors never see (the A4 visitor-answers sheet) may use a white
  paper ground so dense text prints well on an office printer. Its logo, title and names sit on a rubber panel, and
  yellow appears only as floor tape, never as text on white.
- No gradients, glows, drop shadows, transparency effects or other colours. Tints of these colours are not allowed
  except the speckle (§6).
- The speckle texture uses transparency: tell the print shop the PDF contains live transparency (PDF 1.4).
- Large print areas of rubber use rich black; body text under 12 pt prints in 100% K (the print shop handles this from the RGB PDF; mention it on hand-off).

## 4. Type

Three families, all free (SIL Open Font License), in `brand/fonts/`:

| Role | Family | Weights | Case | Use |
| --- | --- | --- | --- | --- |
| Display | **Anton** | 400 (the only weight) | CAPS always | Headlines, big numbers, the arrow |
| Label | **Barlow Condensed** | 600, 700 | CAPS, tracking 0.14 em | Labels, tags, section numbers, data |
| Body | **Barlow** | 400, 500, 600 | Sentence case | Sentences, descriptions, sources |

Rules:
- Anton line height 0.86–0.95; tracking 0.01 em; never faux-bold, italic, outlined or condensed further.
- Never more than **three Anton sizes** on one surface. One hero per surface. In the brochure each panel is a surface
  (it is seen on its own when folded); everywhere else the page, slide or frame is the surface.
- A hero fills its live width. The hero sizes in the table are a guide: a stacked hero (DAY over 90) may go larger to fill
  the width. Never split a number from the word it counts across lines: keep "6 IN 10", "3 VISITS", "90 DAYS",
  "DAY 90" and "$99" together ("3 VISITS / A WEEK." and "THEN $99 / A MONTH." are fine breaks).
- The same words are yellow wherever they appear: "6 IN 10", "3 VISITS A WEEK.", "90 DAYS." (in the board headline),
  "90" in DAY 90, "78%", "$657,000"; on yellow surfaces everything is rubber.
- Body text in reversed print (chalk on rubber) is Barlow **Medium 500**, never lighter, at 9 pt or more.
- Sources and small print: Barlow Regular 400 in steel.
- Data (paces, counts, dates): Barlow Condensed 600 with tabular figures (`.t-data`).
- **Glyph limits.** Barlow and Barlow Condensed have **no → glyph**: an arrow is always set in Anton (`.arrow` class,
  or `<tspan font-family="Anton">`). None of the fonts has ✓ or ↗: don't use them. Anton's digits are proportional:
  a counter that changes digits needs fixed-width slots.
- Letter-spaced labels (tags, rulers) get `font-kerning: none`, so the PDF text stays searchable (with kerning, "DATA"
  extracts as single letters).
- Team names: Barlow Condensed Bold in mixed case, tracking 0.04–0.06 em (the one place label type is not in capitals).
- Section labels follow the pattern `01 — THE PROBLEM` (number, em dash, words) in Barlow Condensed Bold, steel or yellow.

### Type scale per medium

| Role | Slides and reel (px at 1920 × 1080) | Brochure (pt) | Standee (pt at full size) |
| --- | --- | --- | --- |
| Hero (Anton) | 300 (up to 420 for one word) | 96–120 | Fit to the safe width (about 900–1,050) |
| H1 (Anton) | 140 | 34–40 | 220–240 |
| H2 (Anton) | 84 | 20–24 | 130–150 |
| H3 (Anton) | 56 | 14–16 | 90–100 |
| Label (Barlow Condensed 700) | 26–30 | 7–8 | 52–60 |
| Body (Barlow 500) | 34–38 | 9–10 / 13.5 leading | 70–78 |
| Small (Barlow 400) | 22–24 | 6.5–7 | 48–52 (nothing smaller) |

One exception: text **inside** a board or the 13 × 7 days grid (member names, the DAY 30 / 60 / 90 ruler, column headers,
paces, statuses, legend) is product-screen text and may go down to 16 px on screen and 6 pt in print. Nothing else may.

## 5. Logo

- The word **TENURE** (Anton, outlined, +0.02 em) over the **floor tape** in three segments, the same width as the
  word. Optional descriptor MEMBER RETENTION FOR INDEPENDENT GYMS set to the same width beneath. Draw it only with
  `TENURE.logo({ w, ... })` or the files in `brand/assets/` (`logo-*.svg`, `lockup-*.svg`). Never retype it.
- On rubber: chalk word, yellow tape, steel descriptor. On yellow: rubber word, rubber tape, rubber descriptor.
- Clear space on every side: the word's cap height where the format allows, and never less than half of it
  (on the standee and the slides, half the cap height is the working minimum). Minimum word width: 18 mm in print, 160 px on screen
  (below that, drop the descriptor).
- Don't stretch, rotate, outline, recolour, add effects, or put the logo on anything but rubber or yellow.
- The tape's three segments are the first 90 days in 30-day blocks. In motion they may fill one by one.

## 6. Devices (all in `kit.js`)

| Device | Function | Rules |
| --- | --- | --- |
| Floor tape | `tape({ w, h, filled })` | Yellow, three segments, square ends. Underlines, rulers (DAY 30 / 60 / 90), progress. Height about 15% of the cap height it sits under |
| Hazard tape | `hazard({ w, h, stripe })` or `.hazard` | 45° yellow/rubber stripes of equal width. Only along the top or bottom edge of a frame, full width. Never behind text. Two per surface at most. Band: 36 px screen, 6 mm brochure, 2 in standee |
| Plate | `plate({ d, value, sub })` | A weight plate face on. Holds one number in yellow (default `3+` / VISITS A WEEK). One per surface |
| The 90-day board | `board({ w, members, highlight, reveal })` | The product's signature screen. Rows = new members, cells = weeks 1–13. Yellow = 3+ visits, steel = 1–2, outline = none, red = flagged. Always on a `rubber2` panel with the SAMPLE DATA tag |
| Legend | `legend({ w, h })` | One line under a board when there is room |
| One member's 90 days | `days({ w, visits })` | 13 × 7 grid of days. `STAYER` and `SLIPPER` are the shared samples |
| Sample tag | `.sample-tag` | SAMPLE DATA / SAMPLE MESSAGE, label type, steel, hairline box. It sits **inside** the screen panel or bubble it labels, in the panel's top row: top right if that spot is free, otherwise top left. Never outside the panel |
| Rubber speckle | `assets/speckle-tile.svg` | Optional fleck texture on rubber grounds only, tile 512 px (screen) / about 40 mm (print). Never on yellow |
| Arrow | `.arrow` | → in Anton, only in NUDGE → |

Large formats: where the full board's labels would fall below the medium's minimum size (the standee's 48 pt), draw it with
`header`, `pace` and `status` off, redraw the DAY 30 / 60 / 90 ruler at full label size, and set the flagged rows' status
(SLIPPING, and the NUDGE → chip on the highlighted member) just after each flagged row's last cell.

The shared sample members (`TENURE.SAMPLE`) are Maya R., Jo W., Dev P., Chris L., Hana L. and Sam O.; Hana and Sam
are slipping and Sam is the one being nudged. Use the same members everywhere.

## 7. Layout

- Flush left, ragged right. Big type aligns to the left margin; nothing is centred except the plate's contents,
  the reel's single-word slams and the end card.
- Generous rubber. If a surface feels full, remove something.
- Thin rules (rubber3 or steel, 1–2 px / 0.3 mm) separate sections; boxes only for screens, the sample tag and the NUDGE chip.
- Square corners everywhere. The plate is the only round shape.

| Medium | Canvas | Margins and grid |
| --- | --- | --- |
| Slides and reel | 1920 × 1080 px | 120 px left/right, 96 px top/bottom; 12 columns, 32 px gutters; 8 px unit |
| Brochure | A4 landscape, 297 × 210 mm, both sides, + 3 mm bleed | 8 mm safe area inside every trim edge and fold; 2 mm unit |
| Standee | 24 × 60 in (2 × 5 ft) | 1.5 in sides, 2 in top; nothing essential in the bottom 9 in (low zone: price, names, hazard band only); 0.25 in unit |

The standee is read from 1–3 m away and its top sits at about eye level: the logo and the hook go in the top third.

## 8. Motion and sound (the reel; also any slide animation)

- Tempo **120 BPM**: a beat is 0.5 s, a bar is 2 s. Every cut and every hit lands on the beat grid.
- Moves (and nothing else):
  - **Slam**: type or numbers arrive at 118% scale and settle to 100% in 0.18 s (`power4.out`), with a 2–4 px shake for 0.12 s on the heaviest hits.
  - **Tape wipe**: a yellow floor-tape bar sweeps across in 0.3 s and the next scene is behind it.
  - **Hazard wipe**: a full-height band of hazard stripes crosses the frame in 0.45 s, between chapters.
  - **Count**: numbers roll (DAY 1 → DAY 90) in fixed-width digit slots.
  - **Board fill**: cells light one by one on 16th notes; a row turning red is a hit.
  - **Plate spin**: the plate rotates in a quarter turn with `back.out(1.6)` overshoot.
  - **Tape fill**: the logo's three segments fill left to right.
- Easing: entrances `power4.out`, exits `power2.in`. No bounce except the plate.
- At most two things move at once. Text stays on screen at least 0.75 s per 3 words.
- Sound: original, synthesised in code (no samples, no licensed music): kick on the beat, clap on 2 and 4, hats,
  a sub bass, an impact on each slam, a tape-rip swoosh on each wipe, ticks on counts, a soft ping on the nudge.
  A silent version is always delivered too. Master to about −14 LUFS integrated with the peak at or below −1 dBFS
  (measure loudness inside the synth and adjust gain with the limiter in the loop), and fade the last second to rest.

## 9. Medium specs and exports

| Piece | Source | Deliverables (in `exports/`) |
| --- | --- | --- |
| Brochure | `brochure/brochure.html` | `Tenure-brochure-A4-trifold-print.pdf` (2 pages, 303 × 216 mm with 3 mm bleed, fonts embedded); `Tenure-brochure-proof.pdf` (trimmed, fold lines shown) |
| Standee | `standee/standee.html` | `Tenure-standee-2x5ft.pdf` (24 × 60 in, vector, fonts embedded); `Tenure-standee-2x5ft-150dpi.jpg` (3600 × 9000 px) |
| Slides | `slides/` | `Tenure-pitch.pptx` (16:9, editable text in Anton/Barlow, speaker notes; needs the fonts installed); `Tenure-pitch-picture-slides.pptx` (the same slides as exact pictures with the notes: looks right anywhere, not editable); `Tenure-pitch.pdf` (exact look); `Tenure-pitch-fonts/` with an install note |
| Reel | `reel/` | `Tenure-reel-16x9.mp4` (1920 × 1080, 30 fps, H.264, AAC 48 kHz); `Tenure-reel-16x9-silent.mp4`; a poster PNG |

Brochure folding (roll fold, A4 landscape):
- **Outside** (left to right): inside flap **97 mm** · back cover **100 mm** · front cover **100 mm**.
- **Inside** (left to right): **100 mm** · **100 mm** · **97 mm** (the narrow panel folds in first).

## 10. The four pieces — content maps

**Brochure (A4 tri-fold).**
- Outside: *inside flap* = 01 — THE PROBLEM: 6 IN 10 / NEW MEMBERS / QUIT WITHIN / THREE MONTHS. + source + supporting
  line; *back cover* = the yellow sign surface: price, payback (Keep 2 members a month …), team names, small print
  ("Screens show sample data." + sources); *front cover* = hazard band, logo lockup, DAY 90 / GET EVERY NEW MEMBER THERE.
- Inside: *panel 1* = 02 — THE LINE: MEMBERS WHO / STAY HIT 3 VISITS / A WEEK., plate 3+, 78% vs 59%, source;
  *panel 2* = 03 — TENURE: ONE BOARD FOR / EVERY NEW / MEMBER'S FIRST / 90 DAYS. and the board on a screen panel with
  legend and SAMPLE DATA; *panel 3* = 04 — HOW IT WORKS: TRACK / FLAG / NUDGE, each with a small visual (days grid,
  a flagged row, the sample message).

**Standee (2 × 5 ft), top to bottom.** Hazard band · logo lockup · DAY 90 / GET EVERY NEW MEMBER THERE. · the problem
line (6 IN 10 NEW MEMBERS QUIT / WITHIN THREE MONTHS.) with its source · the board with SAMPLE DATA · TRACK · FLAG · NUDGE · (low zone) price line, team names, hazard band.

**Slides (8, about 3 minutes, speaker notes on each).**
1 Title (lockup, KEEP NEW MEMBERS PAST DAY 90., team names) · 2 Problem (6 IN 10 / NEW MEMBERS QUIT WITHIN THREE MONTHS.) ·
3 The line (MEMBERS WHO STAY HIT 3 VISITS A WEEK., plate, 78% / 59%) · 4 Tenure (the board) · 5 Track, flag, nudge ·
6 Price (the yellow sign slide, payback) · 7 Market (55,294 gyms, $1,188, the 1% math, the contrast line) ·
8 Close (the logo, MEMBERS WHO STAY. + team names). Section labels 01–05 as in §2.

**Reel (16:9, about 30 s, 120 BPM = 15 bars).**
Day 1 · the fade (a member's grid stops; 6 IN 10 / NEW MEMBERS QUIT / WITHIN THREE MONTHS.) · the line (MEMBERS / WHO STAY,
then HIT 3 VISITS / A WEEK.; plate; 78% / 59%) · tape wipe to the logo · the board builds (ONE BOARD FOR EVERY NEW /
MEMBER'S FIRST 90 DAYS.), Sam turns red, NUDGE →, the sample message, Sam's next week lights yellow ·
TRACK. FLAG. NUDGE. · FREE 90-DAY PILOT. THEN $99 A MONTH. · end card (lockup, KEEP NEW MEMBERS PAST DAY 90., hazard bands).

## 11. Checklist — every piece must pass all of these

- [ ] Only the seven colours of §3; yellow about 5–12% of each surface; red only for slipping; at most one yellow surface per piece.
- [ ] Only Anton, Barlow Condensed and Barlow, from `brand/fonts/`; fonts embedded in every PDF (`pdffonts` lists them).
- [ ] Anton always in capitals; body in sentence case; at most three Anton sizes per surface; one hero per surface.
- [ ] Logo drawn by `TENURE.logo` or from `brand/assets/`, with its clear space.
- [ ] Hazard tape only along top or bottom edges, at most two bands per surface, never behind text.
- [ ] Every headline and claim is an approved line from §2; every statistic has its source beside it.
- [ ] Every board or dashboard visual carries SAMPLE DATA; the message mock carries SAMPLE MESSAGE.
- [ ] No QR codes, contact details, website, launch date, roles, school, logos of others, photos or icons.
- [ ] Team names exactly: Uzair Imran, Moiz Hamid, Zain ul Abideen, Ali Hassan.
- [ ] Margins and safe areas of §7 respected; nothing essential in the standee's low zone.
- [ ] Exports match §9 (sizes checked with `pdfinfo` / `ffprobe`).
- [ ] Word checks use `pdftotext -raw` (plain `pdftotext` splits letter-spaced labels into single letters).

## 12. The app ("Full volume")

The Tenure app is the owner-and-coach dashboard: **one responsive web app** (desktop and phone, installable to the home
screen), **dark only**. It carries the expo look at full volume (chosen over a quieter "workday" version): Anton for titles,
big numbers and member names in action lists; floor tape under page titles; hazard stripes on areas that need action.
Everything in §1–§12 still applies; this section adds what an interface needs. The product rules (roles, data, metrics,
API) are in `app/SPEC.md`.

### Layout and breakpoints
- **Desktop (≥ 1100 px):** a left sidebar 232 px wide (wordmark with tape at the top, nav, gym name and pilot day at the
  bottom); content to a max of 1440 px with 40 px side padding and 32 px top padding.
- **Tablet (760–1099 px):** the sidebar becomes a 72 px top bar (wordmark, current page, a MENU button opening the nav as a panel); 28 px padding.
- **Phone (< 760 px):** no sidebar; 18 px side padding; a bottom tab bar 78 px tall plus the safe area, with four text tabs
  in label type (active tab yellow). Content scrolls above it.
- Square corners everywhere. One column on phones; at most three columns on desktop.

### Type in the app
| Role | Desktop | Phone |
| --- | --- | --- |
| Page title (Anton, line height 0.9) with floor tape under it | 72 px, tape 250 × 9 px, 12 px below | 52 px, tape 200 × 7 px |
| Section title (Anton) | 30 px | 26 px |
| KPI number (Anton) | 64 px | 44 px |
| Member name in action lists such as SLIPPING NOW (Anton, capitals) | 22 px | 28 px |
| Labels, nav, tabs, buttons (Barlow Condensed 700, capitals, tracking 0.12 em) | 13–15 px | 13–16 px |
| Body and help text (Barlow 500) | 16 px | 16 px (never smaller: phones zoom into smaller inputs) |
| Meta text (Barlow 400, steel) | 14 px | 15 px |
| Table and board data (Barlow Condensed 600, tabular figures) | 15–18 px | 16 px |
On the board and in dense tables, member names are Barlow Condensed 600 capitals (as `kit.board` draws them), not Anton.

### Components
- **Buttons.** Primary: yellow fill, rubber text, label type, 44 px tall (48 px on phones), 18 px side padding, square. One
  primary per region; NUDGE → is the primary wherever a slipping member appears (its arrow in Anton). Secondary: 2 px chalk
  outline, chalk text. Quiet: chalk text, 1.5 px underline 6 px below. Disabled: 40% opacity.
- **Inputs.** rubber2 fill, 1 px rubber3 border, chalk Barlow 500 at 16 px, 48 px tall; the label above in label type, 13 px,
  steel; focus = 2 px yellow outline with a 2 px offset (on every focusable element, not only inputs); errors as one line of
  red text under the field. **Form errors are the one other use of red in the app.**
- **Panels.** rubber2 fill, no border, 20–24 px padding. Lists inside panels use 1 px rubber3 hairlines between rows.
- **KPI tile.** A panel with the label (label type, 13 px, steel) above an Anton number: yellow for ON THE LINE, red for SLIPPING, chalk otherwise.
- **Hazard band.** 16 px tall: on top of the SLIPPING NOW panel on desktop, and along the top edge of a phone's Today screen
  when anyone is slipping. One per screen. Never on calm screens (settings, billing, templates, reports).
- **Status tags.** Label type 12 px, 1 px rubber3 border, no fill: SLIPPING (red text), ON THE LINE (yellow), BELOW THE LINE (steel), NEW (chalk).
- **Phone cards.** On phones, list rows become rubber2 cards 14 px apart, with the full-width NUDGE → button at the bottom of a slipping member's card.
- **The board.** `kit.board`'s geometry, states and colours, drawn live; a row opens the member. The current week (still in
  progress) is drawn as a steel outline that fills yellow once it already has 3 visits. Weeks not reached yet draw nothing.
- **Toasts.** rubber3 with a 1 px steel edge and a shadow, so they never read as part of a panel; a 6 px yellow tape on
  the left edge, chalk text; bottom right on desktop (clear of the sidebar), above the tab bar on phones; 4 s.
- **Dialogs.** Desktop: a centred 560 px panel over rubber at 80%. Phone: a bottom sheet.
- **Empty states.** An Anton section title, one sentence, one primary button.
- **Charts.** SVG: yellow line for members still coming, steel line for the rest, a dashed chalk line at 3 visits a week
  labelled THE LINE · 3 A WEEK; axis labels in Barlow Condensed 600, steel.

### Motion and live updates
- A check-in arriving live lights its board cell with a slam (scale 1.25 → 1 in 0.3 s, `power4.out`-like ease) and a toast
  ("SAM O. CHECKED IN"). KPI numbers count up on first load (0.4 s). Page changes are instant.
- With `prefers-reduced-motion`, nothing moves: changes are instant.

### Copy
- The voice is §2's: calm, exact, sure. The app is where an owner works, so it is the quietest surface: titles are nouns,
  buttons are verbs that say exactly what happens, sentences say what to do next and stop.
- Titles and buttons in capitals (Anton / label type); sentences in sentence case; US spelling; no exclamation marks; numerals.
- The product's words (nudge, slipping, the line, on the line, new) mean the same thing on every screen and every expo piece.
- Toasts in the past tense with no full stop; errors say what happened and what to do; empty states state the fact, then how it fills.
- Words members see (the kiosk, nudge texts) are warm and plain; nudge templates are written in the coach's own voice, signed.
- Statuses: NEW (fewer than 2 finished weeks), ON THE LINE (3+ visits in the last finished week), BELOW THE LINE (1–2), SLIPPING
  (two finished weeks in a row under 2 visits). Definitions in `app/SPEC.md`.
- The demo gym shows the SAMPLE DATA tag in the top right of every screen.

### Accessibility
- Contrast on rubber: chalk 15.6:1, yellow 13:1, steel 5.9:1, red 5.3:1 (red and steel text at 14 px or more).
- Every board cell has an accessible name ("Week 3: no visits"); 44 px touch targets; everything reachable by keyboard; the
  yellow focus outline is never removed.

## 13. Folder map

```
tenure/
  brand/      DESIGN.md · tokens.json · tokens.css · tokens.vars.css (generated) · kit.js · wordmark.js (generated)
              fonts/ (Anton, Barlow, Barlow Condensed + licences) · assets/ (logo and device SVGs) · style-sheet.html
  tools/      render.mjs (HTML → PDF/PNG) · make-assets.mjs · package.json (puppeteer-core, gsap, opentype.js)
  brochure/   standee/   slides/   reel/      one folder per piece, each self-contained apart from brand/ and tools/
  app/        the Tenure app: server/ (API + SQLite) and client/ (React); product rules in app/SPEC.md
  exports/    the finished files
  build/      scratch renders (git-ignored)
```

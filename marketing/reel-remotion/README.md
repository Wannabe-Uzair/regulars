# The Regulars reel

The 30-second film for the stall, made in [Remotion](https://www.remotion.dev) 4.0.541: a question to the gym owner, two
sourced figures, then Sam through Regulars (checked in, slipping, nudged, back) and the end card. The brief, with
Uzair's picks and the script table, is `docs/milestone-2/redesign/wave2/briefs/reel.md`.

This folder is its own package (its own `package.json` and `package-lock.json`), outside the npm workspaces, like
`marketing/slides`. Nothing in `apps/` or `packages/` depends on it.

## Rebuild

```sh
bash marketing/reel-remotion/build.sh
```

One command makes the five outputs in `marketing/exports/`:

| File | What |
| --- | --- |
| `Regulars-reel-16x9.mp4` | 1920 x 1080, 30 fps, H.264 and AAC: voice, music and UI sounds |
| `Regulars-reel-16x9-loop.mp4` | the same picture with the music and UI sounds only (the stall's loop, sound off or on) |
| `Regulars-reel-9x16.mp4` | 1080 x 1920, its own layout (not a crop): voice, music and UI sounds |
| `Regulars-reel-poster-16x9.png`, `Regulars-reel-poster-9x16.png` | the end card's still (frame 891) |
| `Regulars-reel.srt` | the voice-over as subtitles, timed from the voice's own word times |

It runs `npm ci` the first time, renders each picture once, muted (`npx remotion render`), mixes the two soundtracks
and writes the SRT (`node mix.ts`, ffmpeg), then muxes. About three minutes on an M4 Mac mini. It needs Node 26 (it
runs the TypeScript directly) and ffmpeg on the PATH. `remotion.config.ts` points Remotion at the Chrome in
`/Applications` when it is there (otherwise Remotion downloads its own headless shell) and keeps it to 4 tabs.

After a build, `node check.ts` checks the words (captions, SRT and voice against the brief's table; the figures and
sources against `marketing/VISITOR-QA.md`) and scans each MP4 for flashes. `npm run studio` opens the Remotion studio
with the sound playing.

## How it is made

- `src/Reel.tsx` holds both compositions (`Reel16x9`, `Reel9x16`), the captions and the preview sound; `src/scenes.tsx`
  the nine beats, each laid out for the wide and the tall frame; `src/ui.tsx` the shared pieces (the Quarter mark and
  status shapes copied from `packages/ui`, Phosphor icons, the phone's screen, rings).
- `src/theme.ts` copies Iris from `packages/ui/src/tokens.ts` and turns the app's spring family into Remotion springs
  (smooth: stiffness 156, damping 25; quick: 433, 41.6; bounce, for Sam's check only: 121, 15.4).
- `src/cues.ts` lists the picture events and the UI sound placed on each, so the scenes and the mix read the same times.
- `public/` holds the voice (Kokoro, open source), the music and UI sounds (composed in code) and Inter; `public/SOURCES.md`
  says how each was made, and `sound-src/` keeps the scripts that made them.

## The home hero's clip

"The board coming alive", the clip the home page plays beside its headline (Uzair, on the Mac mini): the hero's floating
board, drawn as the page drew it, in a 9-second silent loop. Four members check in (each week fills with the board's pop
and its fading row tint); Sam's weeks thin and his row turns Slipping, with its Nudge; the Nudge is pressed and reads
"Nudged" with its check; a beat later his week fills and he is back on the line; then everything settles back to the
first frame, which is also the poster the page shows under Reduce Motion.

```sh
bash marketing/reel-remotion/build-hero.sh
```

It checks the clip's words against `packages/copy/COPY.md` (`node check-hero.ts`), renders the two compositions at 2x
as PNG frames, checks that each loop's last frame is its first, and writes six files to `apps/web/public/media/` (the
Docker image takes them with the web build; `marketing/` itself is not in the image). About 45 seconds.

| File | What |
| --- | --- |
| `hero-board-wide.mp4`, `.webm` | `HeroBoardWide`: the laptop's table, the card at 896 x 421 (its size at 1280 x 800), 1792 x 842; H.264 (Safari) and VP9, 30 fps, 9.0 s |
| `hero-board-phone.mp4`, `.webm` | `HeroBoardPhone`: the phone's two-line rows, the card at 358 x 580 (its size at 390 x 844), 716 x 1160 |
| `hero-board-wide.webp`, `hero-board-phone.webp` | the first frame, lossless: the video's poster and the still under Reduce Motion |

`src/hero/hero.css` copies the board picture's rules and token values from the app (the film may not import the app's
packages), so a change to the board's look in `apps/web` or `packages/ui` is made here too and the clip rebuilt.
`src/hero/words.ts` holds its words, each COPY.md's entry. The composition's `sample` prop draws the page's old still
(Sam slipping, with his Nudge), to compare a render with a screenshot of the board.

## Licence

Remotion is free for individuals and for companies of up to 3 people; larger companies need a company licence
(https://www.remotion.dev/license). Uzair's team is under that limit. Inter is under the SIL Open Font License 1.1
(`public/fonts/LICENSE.txt`); the Phosphor icon paths are MIT (`packages/ui/src/icons/LICENSE`).

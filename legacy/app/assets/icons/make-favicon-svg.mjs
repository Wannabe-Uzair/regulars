// Writes favicon.svg: the small-size mark (heavier T + one solid yellow bar) as pure shapes, T outlined from Anton.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const opentype = createRequire(import.meta.url)('/Users/apple/myo-app/tenure/tools/node_modules/opentype.js')
const font = opentype.loadSync('/Users/apple/myo-app/tenure/brand/fonts/Anton-Regular.ttf')
const glyph = font.charToGlyph('T')
const bb = glyph.getBoundingBox()          // font units, y up
const capH = bb.y2 - bb.y1, tw = bb.x2 - bb.x1
const S = 64, frac = 0.66, sw = 0.07, gapBelow = 0.10, barT = 0.20
const c = frac * S / (1 + sw + gapBelow + barT), k = c / capH
const topY = (S - frac * S) / 2, baseline = topY + sw * c / 2 + c
const inkW = tw * k + sw * c, x0 = (S - inkW) / 2
const d = glyph.getPath(x0 + sw * c / 2 - bb.x1 * k, baseline, c * (font.unitsPerEm / capH)).toPathData(3)
const by = baseline + sw * c / 2 + gapBelow * c
const f = (n) => +n.toFixed(3)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#141414"/><path d="${d}" fill="#EDEBE6" stroke="#EDEBE6" stroke-width="${f(sw * c)}" stroke-linejoin="miter"/><rect x="${f(x0)}" y="${f(by)}" width="${f(inkW)}" height="${f(barT * c)}" fill="#FFD60A"/></svg>\n`
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'favicon.svg'), svg)

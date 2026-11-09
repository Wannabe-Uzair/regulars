// Pins the reel's live board and days grid to the kit: at their default (final) state they must return the kit's exact SVG.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const T = require('../brand/kit.js')
const L = require('./board-live.js')
const CUES = require('./cues.js')
let n = 0
for (const w of [1060, 1100, 1400]) { assert.equal(L.boardLive({ w }), T.board({ w }), `board w=${w}`); n++ }
for (const [w, visits] of [[720, T.SLIPPER], [720, T.STAYER], [500, T.SLIPPER]]) { assert.equal(L.daysLive({ w, visits }), T.days({ w, visits })); n++ }
// cues: 90 counter ticks ending on DAY 90's slam, one board cell per sample week, every slam and wipe on the 8th-note grid or named off it
assert.equal(CUES.list.filter((c) => c.type === 'count').length, 90); n++
assert.equal(CUES.dayT(89), CUES.S.day90); n++
assert.equal(CUES.list.filter((c) => c.type === 'cell').length, T.SAMPLE.reduce((a, m) => a + m.weeks.length, 0)); n++
assert.ok(CUES.list.every((c) => c.t >= 0 && c.t < CUES.DUR)); n++
console.log(`board-live: ${n} checks passed`)

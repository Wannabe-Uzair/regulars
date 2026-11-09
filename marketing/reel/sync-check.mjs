// Sync check: find sound onsets in the SFX stem (cues only, no bed) and compare them to cue times from cues.js.
// Onset = a 1 ms frame whose energy (after a 400 Hz high-pass, so sub tails do not mask later hits) jumps
// >= 9 dB above the quietest of the preceding 3-12 ms. Each cue is matched to the strongest onset near it. Exit 1 if any listed cue is off by more than one frame (1/30 s).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const here = path.dirname(new URL(import.meta.url).pathname)
const C = createRequire(import.meta.url)('./cues.js')
const file = process.argv[2] || path.join(here, '../build/reel/sfx-stem.wav')
const TOL = 0.033

// read 16-bit stereo PCM (the stem synth.mjs writes), mono-sum
const buf = fs.readFileSync(file)
let off = 12, SR = 0, ch = 0, data = null
while (off < buf.length - 8) { const id = buf.toString('ascii', off, off + 4), sz = buf.readUInt32LE(off + 4)
  if (id === 'fmt ') { ch = buf.readUInt16LE(off + 10); SR = buf.readUInt32LE(off + 12) }
  if (id === 'data') { data = buf.subarray(off + 8, off + 8 + sz); break }
  off += 8 + sz + (sz & 1) }
const N = data.length / (2 * ch), x = new Float64Array(N)
for (let n = 0; n < N; n++) { let s = 0; for (let c = 0; c < ch; c++) s += data.readInt16LE((n * ch + c) * 2); x[n] = s / ch / 32768 }

// 2nd-order high-pass at 400 Hz (RBJ)
{ const w = 2 * Math.PI * 400 / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * 0.707), a0 = 1 + al
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = -2 * cs / a0, a2 = (1 - al) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let n = 0; n < N; n++) { const v = x[n], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[n] = y } }

const H = Math.round(SR / 1000), W = 2 * H, F = Math.floor((N - W) / H), e = new Float64Array(F)
for (let i = 0; i < F; i++) { let s = 0; for (let k = i * H; k < i * H + W; k++) s += x[k] * x[k]; e[i] = 10 * Math.log10(s / W + 1e-14) }
const top = Math.max(...e), onsets = []
for (let i = 12; i < F; i++) {
  let floor = Infinity; for (let k = i - 12; k <= i - 3; k++) floor = Math.min(floor, e[k])
  if (e[i] - floor >= 9 && e[i] > top - 60 && (!onsets.length || (i - onsets[onsets.length - 1].i) * H / SR > 0.012)) onsets.push({ i, jump: e[i] - floor })
}
for (const o of onsets) o.t = (o.i * H + H) / SR                  // centre of the first frame that jumped
// the onset that answers a cue: the strongest jump within a window (so a stray crackle beside a late hit cannot pass it).
// The window is +-0.1 s, narrowed to under half the spacing for the dense cues: count ticks are 33.7 ms apart, cells 125 ms.
const WIN = { count: 0.016, cell: 0.06 }
const nearest = c => onsets.filter(o => Math.abs(o.t - c.t) <= (WIN[c.type] || 0.1)).reduce((b, o) => !b || o.jump > b.jump ? o : b, null)

// the cues checked: >= 8 cues, >= 6 types, including count ticks and the off-grid wipes
const pick = (type, f = () => true) => C.list.find(c => c.type === type && f(c))
const checks = [
  pick('slam', c => c.id === 'day1'),
  pick('count', c => c.day === 1),
  pick('count', c => c.day === 46),
  pick('count', c => c.day === 89),
  pick('exit', c => c.id === 'exit1'),
  pick('wipe', c => c.id === 'hazard'),
  pick('spin'),
  pick('wipe', c => c.id === 'tape1'),
  pick('fill', c => c.n === 0),
  pick('cell', c => c.row === 1 && c.col === 0),
  pick('flag'),
  pick('press'),
  pick('ping'),
  pick('back'),
  pick('wipe', c => c.id === 'tape2'),
  pick('final'),
]
const lab = c => c.type + ' ' + (c.id || (c.type === 'count' ? 'day ' + c.day : c.type === 'cell' ? `r${c.row}c${c.col}` : ''))
console.log(`sync check: ${path.basename(file)}, ${onsets.length} onsets found, tolerance ${TOL} s`)
console.log('cue'.padEnd(18), 'cue t'.padStart(8), 'onset'.padStart(8), 'diff'.padStart(8), 'jump dB'.padStart(8))
let worst = 0
for (const c of checks) { const o = nearest(c), d = o ? o.t - c.t : Infinity; worst = Math.max(worst, Math.abs(d))
  console.log(lab(c).padEnd(18), c.t.toFixed(3).padStart(8), (o ? o.t.toFixed(3) : 'none').padStart(8), ((d >= 0 ? '+' : '-') + Math.abs(d).toFixed(3)).padStart(8),
    (o ? o.jump.toFixed(1) : '').padStart(8), Math.abs(d) <= TOL ? 'ok' : 'OFF') }
console.log(`${checks.length} cues, ${new Set(checks.map(c => c.type)).size} types, worst |diff| ${worst.toFixed(3)} s: ${worst <= TOL ? 'PASS' : 'FAIL'}`)
process.exit(worst <= TOL ? 0 : 1)

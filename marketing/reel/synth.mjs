// Original soundtrack for the Tenure reel. Pure JS synthesis, no samples, no licensed music.
// 120 BPM, E minor (Em | C | D | Bm). Every SFX is placed from cues.js, so picture and sound share one clock.
// Writes reel/soundtrack.wav (full mix) and build/reel/sfx-stem.wav (cues only, for sync-check.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const here = path.dirname(new URL(import.meta.url).pathname)
const C = createRequire(import.meta.url)('./cues.js')
const SR = 48000, DUR = C.DUR, N = Math.round(SR * DUR), BEAT = C.BEAT, S = C.S

// buses: SFX dry + reverb send (cues), KICK (not ducked), BED (ducked by kicks and slams)
const L = new Float32Array(N), R = new Float32Array(N)
const RL = new Float32Array(N), RR = new Float32Array(N)
const KL = new Float32Array(N), KR = new Float32Array(N)
const BL = new Float32Array(N), BR = new Float32Array(N)
const BVL = new Float32Array(N), BVR = new Float32Array(N)       // bed reverb send (claps, pad)
const DUCK = new Float32Array(N).fill(1)
const DRY = [L, R], VERB = [RL, RR], KICK = [KL, KR], BED = [BL, BR], BVERB = [BVL, BVR]

let seed = 90210; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
const mtof = m => 440 * Math.pow(2, (m - 69) / 12)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const panLR = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)]
const at = t => Math.round(t * SR)
function put(bus, i, l, r) { if (i >= 0 && i < N) { bus[0][i] += l; bus[1][i] += r } }
function duck(t, depth, rel) { const i0 = at(t), len = Math.round(rel * 5 * SR)
  for (let k = 0; k < len; k++) { const i = i0 + k; if (i >= N) break; const d = 1 - depth * Math.exp(-k / SR / rel); if (d < DUCK[i]) DUCK[i] = d } }

// --- biquad (RBJ) ---
function biquad(type, f, q) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0
  const set = (f, q) => {
    const w = 2 * Math.PI * clamp(f, 20, SR * 0.45) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q)
    let B0, B1, B2; const A0 = 1 + al, A1 = -2 * cs, A2 = 1 - al
    if (type === 'lp') { B0 = (1 - cs) / 2; B1 = 1 - cs; B2 = (1 - cs) / 2 }
    else if (type === 'hp') { B0 = (1 + cs) / 2; B1 = -(1 + cs); B2 = (1 + cs) / 2 }
    else { B0 = al; B1 = 0; B2 = -al }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0
  }
  set(f, q)
  return { set, run(x) { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y } }
}

// ===================== SFX voices (the cues) =====================
function subDrop(t, amp) {               // the floor shaking under the heaviest hits
  const i0 = at(t), len = Math.round(1.6 * SR); let ph = 0
  for (let k = 0; k < len; k++) { const s = k / SR; ph += 2 * Math.PI * (33 + 42 * Math.exp(-s / 0.11)) / SR
    const v = Math.sin(ph) * Math.exp(-s / 0.42) * Math.min(1, s / 0.003) * amp; put(DRY, i0 + k, v, v) }
}
function impact(t, w, { verb = 0.25, f0 = 50, pan = 0 } = {}) {   // a plate dropped on rubber: body + knock + smack
  const i0 = at(t), len = Math.round(0.7 * SR), lp = biquad('lp', 3200 + 2500 * w, 0.8), bp = biquad('bp', 190, 1.6)
  const [pl, pr] = panLR(pan); let ph = 0
  for (let k = 0; k < len; k++) { const s = k / SR, n = rnd(); ph += 2 * Math.PI * (f0 + 120 * Math.exp(-s / 0.028)) / SR
    const att = Math.min(1, s / 0.0008)
    const body = Math.sin(ph) * Math.exp(-s / (0.11 + 0.09 * w)) * 0.95
    const knock = bp.run(n) * Math.exp(-s / 0.06) * 2.2
    const smack = lp.run(n) * Math.exp(-s / 0.022) * 0.55
    const v = (body + knock + smack) * att * w
    put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, smack * w * verb * pl, smack * w * verb * pr) }
}
function slam(e) { impact(e.t, e.w); if (e.shake) subDrop(e.t, 0.55 * e.w); duck(e.t, 0.25 + 0.45 * Math.min(1, e.w), 0.16) }

function tick(t, f, amp, dec = 0.006, pan = 0, bus = DRY) {
  const i0 = at(t), len = Math.round(dec * 7 * SR), bp = biquad('bp', f, 5); let ph = 0; const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; ph += 2 * Math.PI * f / SR
    const v = (bp.run(rnd()) * 1.5 + Math.sin(ph) * 0.5) * Math.exp(-s / dec) * Math.min(1, s / 0.0004) * amp; put(bus, i0 + k, v * pl, v * pr) }
}
// the counter: a tick per day; visit days are brighter and a fifth up; the whole run creeps up in pitch
function count(e) { const rise = 1 + 0.2 * (e.day - 1) / 89
  if (e.visit) { tick(e.t, 2900 * rise, 0.17, 0.007, 0.15); tick(e.t, 5800 * rise, 0.05, 0.004, 0.15) }
  else tick(e.t, 1500 * rise, 0.075, 0.005, -0.1) }
// board cells: very soft clicks, pitched by visits (0 = an empty week, dull)
function cell(e) { tick(e.t, 900 + 420 * e.v, 0.014 + 0.004 * e.v, 0.004, -0.3 + 0.12 * e.col) }

function sweep(t, dur, f0, f1, amp, { q = 1.1, att = 0.004, tail = 0.15, pan0 = 0, pan1 = 0, verb = 0.2, grain = 0 } = {}) {
  const i0 = at(t), len = Math.round(dur * SR), flt = biquad('bp', f0, q), hp = biquad('hp', 120, 0.7)
  let g = 0, next = 0
  for (let k = 0; k < len; k++) { const x = k / len, s = k / SR; if (k % 32 === 0) flt.set(f0 * Math.pow(f1 / f0, x), q)
    let am = 1
    if (grain) { if (k >= next) { g = 1; next = k + Math.round(SR / (grain * (0.6 + 0.8 * Math.abs(rnd())))) } g *= 0.993; am = 0.35 + 1.1 * g }
    const e = Math.min(1, s / att) * (x > 1 - tail ? (1 - x) / tail : 1)
    const v = hp.run(flt.run(rnd())) * e * am * amp, [pl, pr] = panLR(pan0 + (pan1 - pan0) * x)
    put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * verb, v * pr * verb) }
}
// tape rip: a peel snap, then crackling noise sweeping left to right with the band; it lets go at the end
function wipe(e) { const hz = e.id === 'hazard'
  tick(e.t, 2600, 0.4, 0.004, -0.7); tick(e.t, 5200, 0.2, 0.003, -0.7)
  sweep(e.t, e.dur, hz ? 600 : 900, hz ? 4800 : 6000, hz ? 0.42 : 0.34, { q: 1.3, att: 0.002, tail: 0.1, pan0: -0.8, pan1: 0.8, grain: hz ? 260 : 340, verb: 0.15 }) }
function exit(e) { sweep(e.t, 0.22, 3600, 450, 0.3, { q: 1, att: 0.003, tail: 0.6, pan0: 0, pan1: -0.6, verb: 0.25 }) }

function ring(t, f0, amp, dec, pan = 0, verb = 0.4) {      // inharmonic plate modes
  const modes = [[1, 1], [1.594, 0.6], [2.136, 0.45], [2.653, 0.3], [3.156, 0.2], [4.06, 0.12]]
  const i0 = at(t), len = Math.round(dec * 5 * SR); const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; let v = 0
    for (const [m, a] of modes) v += Math.sin(2 * Math.PI * f0 * m * s) * a * Math.exp(-s * Math.sqrt(m) / dec)
    v *= Math.min(1, s / 0.001) * amp; put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * verb, v * pr * verb) }
}
// the plate rolls in from the right: a whoosh pulsing with the rotation, slowing, and a little ring as it settles
function spin(e) {
  const i0 = at(e.t), len = Math.round(0.7 * SR), bp = biquad('bp', 700, 1.4); let rot = 0
  for (let k = 0; k < len; k++) { const x = k / len, s = k / SR; if (k % 32 === 0) bp.set(1600 - 900 * x, 1.4)
    rot += (16 - 13 * x) / SR
    const env = Math.min(1, s / 0.004) * Math.pow(1 - x, 1.4), am = 0.55 + 0.45 * Math.sin(2 * Math.PI * rot)
    const v = bp.run(rnd()) * env * am * 0.42 * e.w, [pl, pr] = panLR(0.7 - 0.4 * x)
    put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * 0.3, v * pr * 0.3) }
  ring(e.t, 410, 0.035, 0.35, 0.4); ring(e.t + 0.36, 410, 0.05, 0.6, 0.3)
}
function riser(e) {
  const t0 = e.t, t1 = e.end, i0 = at(t0), len = Math.round((t1 - t0) * SR)
  const bp = biquad('bp', 300, 1.3), lp = biquad('lp', 600, 1); let p1 = 0, p2 = 0
  for (let k = 0; k < len; k++) { const x = k / len; if (k % 32 === 0) { bp.set(300 * Math.pow(25, x), 1.3); lp.set(400 + 5000 * x * x, 1.1) }
    const f = mtof(47) * Math.pow(4, x * x); p1 += f / SR; p2 += f * 1.008 / SR
    const env = Math.pow(x, 2.2) * (x > 0.985 ? (1 - x) / 0.015 : 1)
    const v = (bp.run(rnd()) * 0.6 + lp.run((p1 % 1) * 2 - 1 + (p2 % 1) * 2 - 1) * 0.14) * env * 0.5
    put(DRY, i0 + k, v * 0.95, v); put(VERB, i0 + k, v * 0.4, v * 0.4) }
}
// logo tape fill: three heavy thunks, each a step up (E, G, B)
function fill(e) { const f = [41.2, 49, 61.7][e.n]; impact(e.t, 0.85, { f0: f, verb: 0.3 }); duck(e.t, 0.5, 0.15) }

function saw(ph) { return (ph % 1) * 2 - 1 }
function stab(t, midi, amp, dec = 0.16, pan = 0, verb = 0.3) {
  const f = mtof(midi), i0 = at(t), len = Math.round(dec * 5 * SR), lp = biquad('lp', 4000, 1.5); let a = 0, b = 0, c = 0; const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; a += f / SR; b += f * 1.006 / SR; c += f * 0.5 / SR
    if (k % 32 === 0) lp.set(700 + 4500 * Math.exp(-s / 0.05), 1.5)
    const sq = (c % 1) < 0.5 ? 1 : -1
    const v = lp.run(saw(a) + saw(b) + 0.6 * sq) * Math.exp(-s / dec) * Math.min(1, s / 0.001) * amp
    put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * verb, v * pr * verb) }
}
// red flag: a hard descending tritone pair (Bb4 -> E4) over a hit
function flag(e) { impact(e.t, 0.8); subDrop(e.t, 0.5); duck(e.t, 0.6, 0.2)
  stab(e.t, 70, 0.16, 0.09, 0.2); stab(e.t, 58, 0.08, 0.09, 0.2); stab(e.t + 0.125, 64, 0.17, 0.16, -0.2); stab(e.t + 0.125, 52, 0.09, 0.16, -0.2) }
function blip(t, f, amp, dec, pan = 0, verb = 0.2, tri = false) {
  const i0 = at(t), len = Math.round(dec * 6 * SR); let ph = 0; const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; ph += 2 * Math.PI * f / SR
    const o = tri ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph)
    const v = o * Math.exp(-s / dec) * Math.min(1, s / 0.0015) * amp; put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * verb, v * pr * verb) }
}
function press(e) { tick(e.t, 4200, 0.26, 0.003, 0.3); blip(e.t, 1250, 0.14, 0.012, 0.3, 0.05); tick(e.t + 0.075, 3100, 0.09, 0.003, 0.3) }
function bell(t, midi, amp, dec, pan = 0, verb = 0.5) {
  const f = mtof(midi), i0 = at(t), len = Math.round(dec * 4 * SR), parts = [[1, 1], [2.756, 0.32], [5.404, 0.14], [2, 0.25]]; const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; let v = 0
    for (const [m, a] of parts) v += Math.sin(2 * Math.PI * f * m * s) * a * Math.exp(-s * m / dec)
    v *= Math.min(1, s / 0.002) * amp; put(DRY, i0 + k, v * pl, v * pr); put(VERB, i0 + k, v * pl * verb, v * pr * verb) }
}
function ping(e) { bell(e.t, 88, 0.11, 0.45, 0.3); bell(e.t + 0.1, 95, 0.07, 0.5, 0.35) }
// Sam is back: a warm rising chime in the relative major (G B D)
function back(e) { [79, 83, 86].forEach((m, i) => { blip(e.t + i * 0.06, mtof(m), 0.12, 0.22, -0.2 + i * 0.2, 0.5, true); bell(e.t + i * 0.06, m, 0.035, 0.4, -0.2 + i * 0.2) }) }
function final(e) {
  const t = e.t
  impact(t, 1.2, { verb: 0.8 }); subDrop(t, 0.8); kick(t, 1.2); duck(t, 1, 0.5)
  // crash: a lowpassed noise wash falling from bright to dark, mostly into the reverb
  { const i0 = at(t), len = Math.round(1.45 * SR), lp = biquad('lp', 9000, 0.7)
    for (let k = 0; k < len; k++) { const s = k / SR, x = k / len; if (k % 32 === 0) lp.set(9000 * Math.pow(300 / 9000, x), 0.7)
      const v = lp.run(rnd()) * Math.exp(-s / 0.3) * Math.min(1, s / 0.001) * 0.3
      put(DRY, i0 + k, v, v * 0.95); put(VERB, i0 + k, v * 0.9, v * 0.9) } }
  ;[40, 47, 52, 59].forEach((m, i) => stab(t, m, 0.07, 0.32, -0.45 + i * 0.3, 0.7))
  ring(t, 205, 0.06, 0.45, 0, 0.8)
}

// ===================== BED voices =====================
function kick(t, amp = 1) {
  const i0 = at(t), len = Math.round(0.42 * SR); let ph = 0
  for (let k = 0; k < len; k++) { const s = k / SR; ph += 2 * Math.PI * (44 + 110 * Math.exp(-s / 0.032)) / SR
    const e = Math.exp(-s / 0.15) * Math.min(1, s / 0.0015)
    const click = k < 140 ? rnd() * (1 - k / 140) * 0.3 : 0
    const v = Math.tanh((Math.sin(ph) * e + click) * 1.4) * amp; put(KICK, i0 + k, v, v) }
  duck(t, 0.6 * Math.min(1, amp), 0.11)
}
function clap(t, amp = 0.3) {
  const i0 = at(t), len = Math.round(0.3 * SR), bp = biquad('bp', 1350, 0.9), hp = biquad('hp', 600, 0.7)
  for (let k = 0; k < len; k++) { const s = k / SR
    const burst = [0, 0.009, 0.018, 0.026].reduce((a, o) => a + (s >= o ? Math.exp(-(s - o) / 0.006) : 0), 0)
    const e = Math.min(1, burst) * 0.85 + (s > 0.026 ? Math.exp(-(s - 0.026) / 0.09) * 0.5 : 0)
    const v = hp.run(bp.run(rnd())) * e * amp; put(BED, i0 + k, v * 0.95, v); put(BVERB, i0 + k, v * 0.5, v * 0.5) }
}
function hat(t, amp = 0.05, open = false, pan = 0.15) {
  const i0 = at(t), len = Math.round((open ? 0.24 : 0.05) * SR), hp = biquad('hp', 7800, 0.8); const [pl, pr] = panLR(pan)
  for (let k = 0; k < len; k++) { const s = k / SR; const v = hp.run(rnd()) * Math.exp(-s / (open ? 0.07 : 0.012)) * Math.min(1, s / 0.0005) * amp; put(BED, i0 + k, v * pl, v * pr) }
}
// sub bass: sine plus a little saw, saturated so it reads on laptop speakers
function bass(t0, t1, midi, amp = 0.3, cut = 320) {
  const i0 = at(t0), len = Math.round((t1 - t0) * SR), f = mtof(midi), lp = biquad('lp', cut, 0.9); let ph = 0
  for (let k = 0; k < len; k++) { const s = k / SR, x = k / len; ph += f / SR
    const v = Math.tanh((Math.sin(2 * Math.PI * ph) * 1.6 + 0.25 * saw(ph)) ) * Math.min(1, s / 0.006) * (x > 0.92 ? (1 - x) / 0.08 : 1)
    const o = lp.run(v) * amp; put(BED, i0 + k, o, o) }
}
function pad(t0, t1, midis, amp = 0.04, cut = 1200) {
  const i0 = at(t0), len = Math.round((t1 - t0 + 0.3) * SR), lpL = biquad('lp', cut, 0.7), lpR = biquad('lp', cut, 0.7)
  const ph = midis.map(() => [Math.abs(rnd()), Math.abs(rnd())])
  for (let k = 0; k < len; k++) { const s = k / SR; let l = 0, r = 0
    midis.forEach((m, j) => { const f = mtof(m); ph[j][0] += f * 0.996 / SR; ph[j][1] += f * 1.004 / SR; l += saw(ph[j][0]); r += saw(ph[j][1]) })
    const g = Math.min(1, s / 0.12) * (s > t1 - t0 ? Math.max(0, 1 - (s - (t1 - t0)) / 0.3) : 1) * amp / midis.length
    const ol = lpL.run(l) * g, or = lpR.run(r) * g; put(BED, i0 + k, ol, or); put(BVERB, i0 + k, ol * 0.3, or * 0.3) }
}
function clang(t, amp) { const i0 = at(t), len = Math.round(0.25 * SR), f0 = 620          // small plate hit, the gym's cowbell
  for (let k = 0; k < len; k++) { const s = k / SR; let v = 0
    for (const [m, a] of [[1, 1], [1.594, 0.7], [2.653, 0.4]]) v += Math.sin(2 * Math.PI * f0 * m * s) * a * Math.exp(-s * m / 0.05)
    v *= Math.min(1, s / 0.0008) * amp; put(BED, i0 + k, v * 0.8, v); put(BVERB, i0 + k, v * 0.4, v * 0.4) } }

// ===================== SCORE =====================
const voice = { slam, count, exit, wipe, spin, riser, fill, cell, flag, press, ping, back, final }
for (const e of C.list) voice[e.type](e)

// chords per bar, E minor: Em | C | D | Bm, cycling from bar 4 (6.0 s)
const CH = [[[52, 55, 59, 64], 40], [[48, 52, 55, 60], 36], [[50, 54, 57, 62], 38], [[47, 50, 54, 59], 35]]
const chordAt = t => CH[((Math.floor(t / 2) - 3) % 4 + 4) % 4]
const FULL = S.word, BREAK = [S.free, S.end], STOP = S.final

// bars 1-3: kick on 1 and 3 only, under the counter
for (let t = 0; t < 6; t += 1) kick(t, 0.55)
// bar 4: every beat, offbeat hats creep in, the pad opens dark
for (let t = 6; t < 8; t += BEAT) { kick(t, 0.7); hat(t + 0.25, 0.018 + 0.012 * (t - 6)) }
pad(6, 8, chordAt(6)[0], 0.03, 500)
// bars 5-6: bass enters on long notes, hats on 8ths and 16ths, clap on the 4
for (let t = 8; t < 12; t += BEAT) { kick(t, 0.75); hat(t + 0.25, 0.04); hat(t + 0.125, 0.014); hat(t + 0.375, 0.014) }
for (let b = 8; b < 12; b += 2) { const [ch, root] = chordAt(b); pad(b, b + 2, ch, 0.035, 700); bass(b, b + 1.9, root, 0.17, 160); clap(b + 1.5, 0.2) }
// bar 7 to the drop: the riser bar; kick, 16th hats and a clap roll rising, then a held breath from 13.25
{ const [ch, root] = chordAt(12); pad(12, 13.25, ch, 0.04, 900)
  for (let t = 12; t < 13.25; t += BEAT) kick(t, 0.9)
  for (let t = 12; t < 13.25; t += 0.125) hat(t, 0.015 + 0.025 * (t - 12) / 1.25)
  for (let t = 12.5; t < 13.25; t += 0.125) clap(t, 0.06 + 0.16 * (t - 12.5) / 0.75)
  for (let t = 12; t < 13.25; t += 0.25) bass(t, t + 0.2, root, 0.2, 140 + 200 * (t - 12)) }
// full beat from the logo reveal: kick every beat, clap on 2 and 4, 16th hats, offbeat sub bass, a plate clang closing each bar
for (let t = FULL; t < BREAK[0] - 1e-6; t += BEAT) {
  kick(t, 1)
  const beatInBar = Math.round((t % 2) / BEAT)
  if (beatInBar === 1 || beatInBar === 3) clap(t, 0.3)
  hat(t + 0.25, 0.05, beatInBar === 3 && Math.floor(t / 2) % 2 === 1); hat(t + 0.125, 0.022, false, -0.15); hat(t + 0.375, 0.022, false, -0.15)
  const [, root] = chordAt(t); bass(t + 0.25, t + 0.47, beatInBar === 3 ? root + 12 : root, 0.3, 380)
  if (beatInBar === 3) clang(t + 0.375, 0.035)
}
for (let b = 14; b < 26; b += 2) pad(b, b + 2, chordAt(b)[0], 0.045, 1600)
pad(FULL, 14, chordAt(12)[0], 0.045, 1600)
// filtered break for the price (26-28): no kick; held bass and pad, claps and hats keep time behind the filter
{ const [ch, root] = chordAt(26); pad(26, 28.5, ch, 0.05, 1400); bass(26, 27.9, root, 0.2, 300)
  for (let t = 26; t < 28; t += BEAT) { hat(t + 0.25, 0.05); if (Math.round((t % 2) / BEAT) % 2 === 1) clap(t, 0.25) } }
// back in for one beat on "end", then the final hit stops everything
kick(S.end, 1); clap(S.end, 0.2); bass(S.end + 0.25, S.end + 0.47, 40, 0.3, 380)

// ===================== MIX =====================
function reverb(inp, spread, fb = 0.84) {
  const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => Math.round((d + spread) * SR / 44100)), aps = [556, 441, 341].map(d => Math.round((d + spread) * SR / 44100))
  const cb = combs.map(d => ({ b: new Float32Array(d), i: 0, f: 0 }))
  for (let n = 0; n < N; n++) { const x = inp[n] * 0.015; let y = 0
    for (const c of cb) { const o = c.b[c.i]; c.f = o * 0.7 + c.f * 0.3; c.b[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.b.length; y += o } out[n] = y }
  for (const d of aps) { const b = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const bo = b[i], v = out[n]; b[i] = v + bo * 0.5; i = (i + 1) % d; out[n] = -v + bo } }
  return out
}
const vL = reverb(RL, 0), vR = reverb(RR, 23), bvL = reverb(BVL, 11), bvR = reverb(BVR, 37)

// the bed: ducked, then one lowpass that only closes for the break (and fades the bed out under the final hit)
const bedL = new Float32Array(N), bedR = new Float32Array(N)
{ let d = 1; const lpL = biquad('lp', 18000, 0.9), lpR = biquad('lp', 18000, 0.9)
  const cutAt = t => t < BREAK[0] - 0.05 || t >= BREAK[1] ? 18000 : t < BREAK[0] ? 18000 * Math.pow(420 / 18000, (t - BREAK[0] + 0.05) / 0.05) : 420 * Math.pow(2400 / 420, (t - BREAK[0]) / 2)
  for (let n = 0; n < N; n++) { const t = n / SR
    if (n % 32 === 0) { const c = cutAt(t), q = t >= BREAK[0] && t < BREAK[1] ? 2.2 : 0.9; lpL.set(c, q); lpR.set(c, q) }
    d += (DUCK[n] - d) * (DUCK[n] < d ? 0.03 : 0.0008)
    const stop = t < STOP ? 1 : Math.exp(-(t - STOP) / 0.08)
    bedL[n] = lpL.run((BL[n] + bvL[n]) * d + KL[n]) * stop; bedR[n] = lpR.run((BR[n] + bvR[n]) * d + KR[n]) * stop } }
const sfxL = new Float32Array(N), sfxR = new Float32Array(N)
for (let n = 0; n < N; n++) { sfxL[n] = L[n] + vL[n]; sfxR[n] = R[n] + vR[n] }

// master: high-pass the rumble, gentle tanh saturation, then a look-ahead limiter at -1.3 dBFS; gain set to hit -14 LUFS
const CEIL = Math.pow(10, -1.3 / 20), TARGET = -14
function master(gain, xl, xr, { limit = true } = {}) {
  const ol = new Float32Array(N), or = new Float32Array(N), hpL = biquad('hp', 28, 0.7), hpR = biquad('hp', 28, 0.7), DRIVE = 0.6
  for (let n = 0; n < N; n++) { ol[n] = Math.tanh(hpL.run(xl[n]) * gain * DRIVE) / DRIVE; or[n] = Math.tanh(hpR.run(xr[n]) * gain * DRIVE) / DRIVE }
  if (!limit) return [ol, or]
  const LA = Math.round(0.004 * SR), need = new Float32Array(N), h = new Float32Array(N)
  for (let n = 0; n < N; n++) { const p = Math.max(Math.abs(ol[n]), Math.abs(or[n])); need[n] = p > CEIL ? CEIL / p : 1 }
  // look-ahead minimum with release, then a box average over the look-ahead: gain is always <= need at every peak
  { const rel = 1 - Math.exp(-1 / (0.08 * SR)); let g = 1
    for (let n = 0; n < N; n++) { let mn = 1; for (let k = n; k <= Math.min(N - 1, n + LA); k++) if (need[k] < mn) mn = need[k]
      g = Math.min(mn, g + (1 - g) * rel); h[n] = g } }
  let acc = 0; const gl = new Float32Array(N)
  for (let n = 0; n < N; n++) { acc += h[n]; if (n > LA) acc -= h[n - LA - 1]; gl[n] = acc / Math.min(n + 1, LA + 1) }
  let mn = 1, busy = 0; for (let n = 0; n < N; n++) { ol[n] *= gl[n]; or[n] *= gl[n]; mn = Math.min(mn, gl[n]); if (gl[n] < 0.891) busy++ }
  master.gr = [-20 * Math.log10(mn), 100 * busy / N]
  return [ol, or]
}
// BS.1770-4 integrated loudness (48 kHz K-weighting, 400 ms blocks, 75 % overlap, absolute and relative gates)
function lufs(xl, xr, from = 0, to = N) {
  const kw = x => { const o = new Float64Array(to - from); let a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0, d1 = 0, d2 = 0
    for (let n = from; n < to; n++) { const v = x[n]
      const y = 1.53512485958697 * v - 2.69169618940638 * a1 + 1.19839281085285 * a2 + 1.69065929318241 * b1 - 0.73248077421585 * b2; a2 = a1; a1 = v; b2 = b1; b1 = y
      const z = y - 2 * c1 + c2 + 1.99004745483398 * d1 - 0.99007225036621 * d2; c2 = c1; c1 = y; d2 = d1; d1 = z; o[n - from] = z } return o }
  const kl = kw(xl), kr = kw(xr), B = Math.round(0.4 * SR), H = Math.round(0.1 * SR), z = []
  for (let s = 0; s + B <= kl.length; s += H) { let e = 0; for (let k = s; k < s + B; k++) e += kl[k] * kl[k] + kr[k] * kr[k]; z.push(e / B) }
  const L = e => -0.691 + 10 * Math.log10(e), g1 = z.filter(e => L(e) > -70)
  const rel = L(g1.reduce((a, b) => a + b, 0) / g1.length) - 10, g2 = g1.filter(e => L(e) > rel)
  return L(g2.reduce((a, b) => a + b, 0) / g2.length)
}
const mixL = new Float32Array(N), mixR = new Float32Array(N)
for (let n = 0; n < N; n++) { mixL[n] = sfxL[n] + bedL[n] * 0.9; mixR[n] = sfxR[n] + bedR[n] * 0.9 }
let gain = 1, outL, outR, I
for (let it = 0; it < 6; it++) { [outL, outR] = master(gain, mixL, mixR); I = lufs(outL, outR); if (Math.abs(I - TARGET) < 0.05) break; gain *= Math.pow(10, (TARGET - I) / 20) }
// the loop's rest: the final tail is eased to silence over the last second
{ const f0 = at(29.0); for (let n = f0; n < N; n++) { const x = (n - f0) / (N - f0), g = Math.pow(1 - x, 2.5); outL[n] *= g; outR[n] *= g } }

function writeWav(file, xl, xr) {
  const buf = Buffer.alloc(44 + N * 4)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
  for (let n = 0; n < N; n++) { buf.writeInt16LE(Math.round(clamp(xl[n], -1, 1) * 32767), 44 + n * 4); buf.writeInt16LE(Math.round(clamp(xr[n], -1, 1) * 32767), 46 + n * 4) }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf)
}
const OUT = path.join(here, 'soundtrack.wav'), STEM = path.join(here, '../build/reel/sfx-stem.wav')
writeWav(OUT, outL, outR)
{ const [sl, sr] = master(gain, sfxL, sfxR, { limit: false }); let p = 0; for (let n = 0; n < N; n++) p = Math.max(p, Math.abs(sl[n]), Math.abs(sr[n]))
  const g = CEIL / p; for (let n = 0; n < N; n++) { sl[n] *= g; sr[n] *= g }; writeWav(STEM, sl, sr) }

// report: loudness, peak, and the arrangement shape as RMS per bar
const db = v => (20 * Math.log10(v + 1e-12)).toFixed(1)
const rms = (a, b) => { let e = 0; for (let n = at(a); n < at(b); n++) e += outL[n] * outL[n] + outR[n] * outR[n]; return Math.sqrt(e / (2 * (at(b) - at(a)))) }
let pk = 0; for (let n = 0; n < N; n++) pk = Math.max(pk, Math.abs(outL[n]), Math.abs(outR[n]))
console.log(`soundtrack.wav  ${DUR.toFixed(3)} s  ${SR} Hz stereo 16-bit  I ${I.toFixed(2)} LUFS  peak ${db(pk)} dBFS  gain ${gain.toFixed(2)}  limiter max GR ${master.gr[0].toFixed(1)} dB, >1 dB GR ${master.gr[1].toFixed(1)} % of samples`)
console.log('RMS per bar (dBFS):', Array.from({ length: 15 }, (_, b) => `${b + 1}:${db(rms(2 * b, 2 * b + 2))}`).join(' '))
const body = rms(16, 24), rest = rms(29.2, 30)
console.log(`RMS 16-24 s ${db(body)}  13.5-26 s ${db(rms(13.5, 26))}  break 26-28 s ${db(rms(26, 28))}  rest 29.2-30 s ${db(rest)}  (rest is ${(20 * Math.log10(body / rest)).toFixed(1)} dB below)`)
console.log('sfx stem ->', path.normalize(STEM))

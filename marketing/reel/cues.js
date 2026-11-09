/* Tenure reel: every timed event, in seconds. Read by reel.html (window.CUES), synth.mjs and sync-check.mjs (require),
 * so picture and sound agree to the frame. 120 BPM: beat 0.5 s, bar 2 s, 15 bars = 30.0 s. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports
  const T = isNode ? require('../brand/kit.js') : root.TENURE
  const api = factory(T)
  if (isNode) module.exports = api
  else root.CUES = api
})(typeof self !== 'undefined' ? self : this, function (T) {
  const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 30, FPS = 30

  // chapter times (all on the beat grid unless noted)
  const S = {
    bands: 0.0, day1: 0.5, ruler: 1.5,
    countStart: 2.0, countEnd: 5.0, day90: 5.0, exit1: 5.3,      // exit1: 0.2 s exit ending on 5.5
    six: 5.5, gone: 6.0,
    hazardWipe: 7.5, hazardDur: 0.45,
    ones: 8.0, plate: 9.0, hit3: 9.5, exit2: 10.8,                // exit2: 0.2 s exit ending on 11.0
    p78: 11.0, p59: 11.5,
    riser: [12.0, 13.5], tapeWipe1: 13.2, tapeDur: 0.3,           // tape wipe ends on 13.5
    word: 13.5, seg: [14.0, 14.5, 15.0], desc: 15.5,
    head: 16.5, panel: 17.0, rows: 17.5, rowStep: 0.5, cellStep: 0.125,
    flag: 20.5, press: 21.0, ping: 21.5, back: 23.0,
    track: 24.0, flagW: 24.5, nudge: 25.0,
    tapeWipe2: 25.7,                                              // ends on 26.0
    free: 26.0, then: 26.5,
    end: 28.0, final: 28.5,
  }

  // the counter: day d (1-90) is reached when cell d-1 of the member's grid lights
  const dayT = (i) => S.countStart + (i * (S.countEnd - S.countStart)) / 89
  const visits = new Set(T.SLIPPER)

  // the board build: row k starts on its beat, its cells follow on 16th notes
  const cellT = (k, j) => S.rows + k * S.rowStep + j * S.cellStep

  const list = []
  const add = (t, type, o = {}) => list.push({ t: Math.round(t * 1e6) / 1e6, type, ...o })

  add(S.bands, 'slam', { id: 'bands', w: 0.8 })
  add(S.day1, 'slam', { id: 'day1', w: 1 })
  add(S.ruler, 'slam', { id: 'ruler', w: 0.35 })
  for (let i = 0; i < 90; i++) add(dayT(i), 'count', { day: i + 1, visit: visits.has(i) })
  add(S.day90, 'slam', { id: 'day90', w: 1, shake: true })
  add(S.exit1, 'exit', { id: 'exit1' })
  add(S.six, 'slam', { id: 'six', w: 1, shake: true })
  add(S.gone, 'slam', { id: 'gone', w: 0.6 })
  add(S.hazardWipe, 'wipe', { id: 'hazard', dur: S.hazardDur })
  add(S.ones, 'slam', { id: 'ones', w: 0.7 })
  add(S.plate, 'spin', { id: 'plate', w: 0.8 })
  add(S.hit3, 'slam', { id: 'hit3', w: 0.7 })
  add(S.exit2, 'exit', { id: 'exit2' })
  add(S.p78, 'slam', { id: 'p78', w: 1, shake: true })
  add(S.p59, 'slam', { id: 'p59', w: 0.6 })
  add(S.riser[0], 'riser', { id: 'riser', end: S.riser[1] })
  add(S.tapeWipe1, 'wipe', { id: 'tape1', dur: S.tapeDur })
  add(S.word, 'slam', { id: 'word', w: 1, shake: true })
  S.seg.forEach((t, i) => add(t, 'fill', { id: 'seg' + (i + 1), n: i }))
  add(S.desc, 'slam', { id: 'desc', w: 0.3 })
  add(S.head, 'slam', { id: 'head', w: 0.7 })
  add(S.panel, 'slam', { id: 'panel', w: 0.4 })
  T.SAMPLE.forEach((m, k) => m.weeks.forEach((v, j) => add(cellT(k, j), 'cell', { row: k, col: j, v })))
  add(S.flag, 'flag', { id: 'flag', w: 1, shake: true })
  add(S.press, 'press', { id: 'press' })
  add(S.ping, 'ping', { id: 'ping' })
  add(S.back, 'back', { id: 'back' })
  add(S.track, 'slam', { id: 'track', w: 1, shake: true })
  add(S.flagW, 'slam', { id: 'flagW', w: 1, shake: true })
  add(S.nudge, 'slam', { id: 'nudge', w: 1, shake: true })
  add(S.tapeWipe2, 'wipe', { id: 'tape2', dur: S.tapeDur })
  add(S.free, 'slam', { id: 'free', w: 1, shake: true })
  add(S.then, 'slam', { id: 'then', w: 0.7 })
  add(S.end, 'slam', { id: 'end', w: 0.7 })
  add(S.final, 'final', { id: 'final', w: 1.2, shake: true })
  list.sort((a, b) => a.t - b.t)

  return { BPM, BEAT, BAR, DUR, FPS, S, dayT, cellT, list }
})

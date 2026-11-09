/* Tenure kit: the shared graphic devices of the Gym floor design code, drawn the same way in every piece.
 *
 * Browser:  <script src="../brand/wordmark.js"></script><script src="../brand/kit.js"></script>  ->  window.TENURE
 * Node:     const T = require('../brand/kit.js')
 *
 * Every function returns an SVG string. Sizes are in whatever unit the caller works in (px on screen, pt or mm in print):
 * the SVG's width/height carry the number you pass; set the unit with the `unit` option ('' = px, 'mm', 'pt', 'in').
 * Colours come from tokens.json and must not be overridden with anything outside it.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports
  const WM = isNode ? require('./wordmark.js') : root.TENURE_WORDMARK
  const api = factory(WM)
  if (isNode) module.exports = api
  else root.TENURE = api
})(typeof self !== 'undefined' ? self : this, function (WM) {
  const C = { rubber: '#141414', rubber2: '#1F1F1F', rubber3: '#2B2B2B', chalk: '#EDEBE6', steel: '#8C9098', yellow: '#FFD60A', red: '#FF4B3E' }
  const F = {
    display: "Anton, Impact, 'Arial Narrow', sans-serif",
    label: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    body: "Barlow, 'Helvetica Neue', Arial, sans-serif",
  }
  let uid = 0
  const nid = (p) => `${p}${++uid}`
  const r3 = (v) => Math.round(v * 1000) / 1000
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = (w, h, vb, body, unit = '', extra = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(w)}${unit}" height="${r3(h)}${unit}" viewBox="${vb}" ${extra}>${body}</svg>`

  /* ---------------------------------------------------------------- floor tape
   * A yellow bar in three equal segments: three 30-day blocks, the first 90 days.
   * `filled` (0-3, fractions allowed) lights segments left to right; the rest show as rubber3 (for progress, e.g. in the reel). */
  function tape({ w, h, segments = 3, gap, color = C.yellow, empty = C.rubber3, filled = segments, unit = '' }) {
    const g = gap ?? h * 0.46
    const seg = (w - g * (segments - 1)) / segments
    let b = ''
    for (let i = 0; i < segments; i++) {
      const x = i * (seg + g)
      const f = Math.max(0, Math.min(1, filled - i))
      if (f < 1) b += `<rect x="${r3(x)}" y="0" width="${r3(seg)}" height="${r3(h)}" fill="${empty}"/>`
      if (f > 0) b += `<rect x="${r3(x)}" y="0" width="${r3(seg * f)}" height="${r3(h)}" fill="${color}"/>`
    }
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }

  /* ---------------------------------------------------------------- hazard tape
   * 45° stripes of equal width, yellow on rubber. Only along the top or bottom edge of a frame; never behind text. */
  function hazard({ w, h, stripe, color = C.yellow, ground = C.rubber, unit = '' }) {
    const s = stripe ?? h / 2
    const id = nid('hz')
    const b = `<defs><pattern id="${id}" width="${r3(s * 2)}" height="${r3(s * 2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="${r3(s)}" height="${r3(s * 2)}" fill="${color}"/></pattern></defs>` +
      `<rect width="${r3(w)}" height="${r3(h)}" fill="${ground}"/><rect width="${r3(w)}" height="${r3(h)}" fill="url(#${id})"/>`
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit, 'preserveAspectRatio="none"')
  }

  /* ---------------------------------------------------------------- logo
   * The outlined TENURE (Anton, +0.02 em) with the three-segment floor tape under it, optionally the descriptor
   * "MEMBER RETENTION FOR INDEPENDENT GYMS" set to the same width. Font-independent: no text elements.
   * Pass the width of the word (w). On rubber: word chalk, tape yellow. On yellow: word rubber, tape rubber. */
  function logoGeometry(descriptor) {
    const H = WM.word.h
    const tapeY = H * 1.16, tapeH = H * 0.15
    const descY = tapeY + tapeH + H * 0.22
    const total = descriptor ? descY + WM.desc.h : tapeY + tapeH
    return { H, W: WM.word.w, tapeY, tapeH, descY, total }
  }
  function logo({ w, word = C.chalk, tapeColor = C.yellow, descriptor = false, descColor = C.steel, tapeFilled = 3, unit = '' }) {
    const g = logoGeometry(descriptor)
    const k = w / g.W
    const segGap = g.H * 0.07
    const seg = (g.W - segGap * 2) / 3
    let b = `<path d="${WM.word.d}" fill="${word}"/>`
    for (let i = 0; i < 3; i++) {
      const x = i * (seg + segGap), f = Math.max(0, Math.min(1, tapeFilled - i))
      if (f > 0) b += `<rect x="${r3(x)}" y="${r3(g.tapeY)}" width="${r3(seg * f)}" height="${r3(g.tapeH)}" fill="${tapeColor}"/>`
    }
    if (descriptor) b += `<path d="${WM.desc.d}" transform="translate(0 ${r3(g.descY)})" fill="${descColor}"/>`
    return svg(w, g.total * k, `0 0 ${r3(g.W)} ${r3(g.total)}`, b, unit)
  }
  /* Height of a logo of word-width w, so layouts can reserve space. */
  const logoHeight = (w, descriptor = false) => logoGeometry(descriptor).total * (w / WM.word.w)

  /* ---------------------------------------------------------------- plate
   * A weight plate seen face on. Holds one number (Anton, yellow) above the hub and one label below it. One per surface. */
  function plate({ d, value = '3+', sub = 'VISITS A WEEK', valueColor = C.yellow, unit = '' }) {
    const c = d / 2
    const b =
      `<circle cx="${c}" cy="${c}" r="${r3(d * 0.488)}" fill="${C.rubber2}" stroke="${C.chalk}" stroke-width="${r3(d * 0.012)}"/>` +
      `<circle cx="${c}" cy="${c}" r="${r3(d * 0.41)}" fill="none" stroke="${C.rubber3}" stroke-width="${r3(d * 0.06)}"/>` +
      `<circle cx="${c}" cy="${c}" r="${r3(d * 0.335)}" fill="none" stroke="${C.chalk}" stroke-width="${r3(d * 0.005)}"/>` +
      `<circle cx="${c}" cy="${c}" r="${r3(d * 0.1)}" fill="${C.chalk}"/>` +
      `<circle cx="${c}" cy="${c}" r="${r3(d * 0.046)}" fill="${C.rubber}"/>` +
      `<text x="${c}" y="${r3(c - d * 0.145)}" text-anchor="middle" font-family="${F.display}" font-size="${r3(d * 0.17)}" fill="${valueColor}">${esc(value)}</text>` +
      `<text x="${c}" y="${r3(c + d * 0.215)}" text-anchor="middle" font-family="${F.label}" font-weight="700" font-size="${r3(d * 0.05)}" letter-spacing="${r3(d * 0.05 * 0.14)}" fill="${C.steel}">${esc(sub)}</text>`
    return svg(d, d, `0 0 ${d} ${d}`, b, unit)
  }

  /* ---------------------------------------------------------------- the 90-day board
   * One row per new member, one cell per week since joining (13 weeks = 90 days).
   * Cell states: 3+ visits = yellow (on the line), 1-2 = steel, 0 = rubber3 outline, not yet reached = nothing.
   * Flag rule: two weeks in a row under 2 visits -> name and those weeks in red, status SLIPPING.
   * The highlighted member gets the NUDGE -> chip instead (the arrow is set in Anton: Barlow has no arrow glyph). Always shown with the SAMPLE DATA tag nearby. */
  const SAMPLE = [
    { name: 'Maya R.', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3] },
    { name: 'Jo W.', weeks: [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3] },
    { name: 'Dev P.', weeks: [2, 3, 3, 4, 3, 3] },
    { name: 'Chris L.', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2] },
    { name: 'Hana L.', weeks: [3, 2, 2, 1, 1, 0], lastSeen: 9 },
    { name: 'Sam O.', weeks: [2, 1, 0], lastSeen: 11 },
  ]
  const isFlagged = (m) => m.weeks.length >= 2 && m.weeks.slice(-2).every((v) => v < 2)
  const paceOf = (m) => { const l = m.weeks.slice(-3); return Math.round((l.reduce((a, b) => a + b, 0) / l.length) * 10) / 10 }
  const cellState = (v) => (v == null ? 'future' : v >= 3 ? 'on' : v >= 1 ? 'low' : 'none')

  function cellRect(x, y, s, state, flag) {
    const sw = s * 0.09
    if (state === 'future') return ''
    if (state === 'on') return `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${C.yellow}"/>` + (flag ? `<rect x="${r3(x + sw / 2)}" y="${r3(y + sw / 2)}" width="${r3(s - sw)}" height="${r3(s - sw)}" fill="none" stroke="${C.red}" stroke-width="${r3(sw)}"/>` : '')
    if (state === 'low') return `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${flag ? C.red : C.steel}"/>`
    return `<rect x="${r3(x + sw / 2)}" y="${r3(y + sw / 2)}" width="${r3(s - sw)}" height="${r3(s - sw)}" fill="none" stroke="${flag ? C.red : C.rubber3}" stroke-width="${r3(sw)}"/>`
  }

  function board({ w, members = SAMPLE, weeks = 13, header = true, pace = true, status = true, highlight = 'Sam O.', reveal = Infinity, unit = '' }) {
    // columns as fractions of w: name | cells | pace | status
    const nameW = w * 0.19, statusW = status ? w * 0.17 : 0, paceW = pace ? w * 0.09 : 0
    const cellsW = w - nameW - paceW - statusW - w * 0.02
    const s = cellsW / (weeks + (weeks - 1) * 0.22), gap = s * 0.22
    const rowH = s * 1.62
    const x0 = nameW
    const headH = header ? s * 2.3 : 0
    const fs = s * 0.62
    let b = ''
    if (header) {
      // the floor-tape ruler: day 30 / 60 / 90 over the week cells
      const tH = s * 0.24, tY = s * 1.15
      b += `<g transform="translate(${r3(x0)} ${r3(tY)})">${tape({ w: cellsW, h: tH }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
      ;['DAY 30', 'DAY 60', 'DAY 90'].forEach((t, i) => {
        const xr = x0 + (cellsW * (i + 1)) / 3
        b += `<text x="${r3(xr)}" y="${r3(tY - s * 0.32)}" text-anchor="end" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">${t}</text>`
      })
      b += `<text x="0" y="${r3(tY + tH)}" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">NEW MEMBER</text>`
      if (pace) b += `<text x="${r3(x0 + cellsW + w * 0.02 + paceW)}" y="${r3(tY + tH)}" text-anchor="end" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">PACE</text>`
    }
    members.forEach((m, ri) => {
      const y = headH + ri * rowH
      const flag = isFlagged(m)
      const hi = flag && m.name === highlight
      const cy = y + (rowH - s) / 2
      b += `<text x="0" y="${r3(cy + s * 0.8)}" font-family="${F.label}" font-weight="600" font-size="${r3(fs * 1.18)}" letter-spacing="${r3(fs * 0.02)}" fill="${flag ? C.red : C.chalk}">${esc(m.name.toUpperCase())}</text>`
      for (let c = 0; c < weeks; c++) {
        const v = c < m.weeks.length && c < reveal ? m.weeks[c] : null
        const lastTwo = flag && c >= m.weeks.length - 2
        b += cellRect(x0 + c * (s + gap), cy, s, cellState(v), lastTwo)
      }
      if (pace) b += `<text x="${r3(x0 + cellsW + w * 0.02 + paceW)}" y="${r3(cy + s * 0.8)}" text-anchor="end" font-family="${F.label}" font-weight="600" font-size="${r3(fs * 1.05)}" fill="${flag ? C.red : C.steel}">${paceOf(m).toFixed(1)}/WK</text>`
      if (status && flag) {
        const sx = w - statusW + w * 0.012
        if (hi) {
          const bw = statusW - w * 0.012, bh = s * 1.12
          b += `<rect x="${r3(sx)}" y="${r3(cy + (s - bh) / 2)}" width="${r3(bw)}" height="${r3(bh)}" fill="${C.yellow}"/>` +
            `<text x="${r3(sx + bw / 2)}" y="${r3(cy + s * 0.78)}" text-anchor="middle" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.95)}" letter-spacing="${r3(fs * 0.95 * 0.12)}" fill="${C.rubber}">NUDGE <tspan font-family="${F.display}" font-weight="400" letter-spacing="0">→</tspan></text>`
        } else {
          b += `<text x="${r3(sx)}" y="${r3(cy + s * 0.78)}" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.95)}" letter-spacing="${r3(fs * 0.95 * 0.14)}" fill="${C.red}">SLIPPING</text>`
        }
      }
    })
    const h = headH + members.length * rowH
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }
  const boardHeight = (w, n = SAMPLE.length, weeks = 13, header = true) => {
    const nameW = w * 0.19, statusW = w * 0.17, paceW = w * 0.09
    const cellsW = w - nameW - paceW - statusW - w * 0.02
    const s = cellsW / (weeks + (weeks - 1) * 0.22)
    return (header ? s * 2.3 : 0) + n * s * 1.62
  }

  /* Board legend: one line, label type. */
  function legend({ w, h, unit = '' }) {
    const s = h * 0.62, fs = h * 0.6, items = [['on', '3+ VISITS'], ['low', '1–2'], ['none', 'NONE'], ['flag', 'SLIPPING']]
    let x = 0, b = ''
    items.forEach(([st, t]) => {
      const y = (h - s) / 2
      b += st === 'flag' ? `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${C.red}"/>` : cellRect(x, y, s, st, false)
      b += `<text x="${r3(x + s * 1.45)}" y="${r3(y + s * 0.84)}" font-family="${F.label}" font-weight="700" font-size="${r3(fs)}" letter-spacing="${r3(fs * 0.14)}" fill="${C.steel}">${t}</text>`
      x += s * 1.45 + t.length * fs * 0.6 + s * 1.6
    })
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }

  /* ---------------------------------------------------------------- one member's 90 days
   * 13 columns (weeks) x 7 rows (days). A visit is a yellow square. `visits` = array of day indices (0-89) visited. */
  // a member who stays: 3-4 visits a week on varying days; a member who slips: fewer each week, nothing after day 31
  const STAYER = (() => { let sd = 7; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296); const v = []
    for (let wk = 0; wk < 13; wk++) { const n = rnd() < 0.55 ? 3 : 4, picked = new Set(); while (picked.size < n) picked.add(Math.floor(rnd() * 7))
      picked.forEach((d) => { const i = wk * 7 + d; if (i < 90) v.push(i) }) } return v })()
  const SLIPPER = [0, 2, 4, 6, 8, 11, 13, 16, 19, 24, 31]
  function days({ w, visits = STAYER, color = C.yellow, unit = '' }) {
    const s = w / (13 + 12 * 0.25), gap = s * 0.25
    const set = new Set(visits)
    let b = ''
    for (let wk = 0; wk < 13; wk++) for (let d = 0; d < 7; d++) {
      const i = wk * 7 + d
      if (i >= 90) continue
      const x = wk * (s + gap), y = d * (s + gap)
      b += set.has(i) ? `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${color}"/>` : `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${C.rubber3}"/>`
    }
    const h = 7 * s + 6 * gap
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }

  return { C, F, SAMPLE, STAYER, SLIPPER, isFlagged, paceOf, tape, hazard, logo, logoHeight, plate, board, boardHeight, legend, days }
})

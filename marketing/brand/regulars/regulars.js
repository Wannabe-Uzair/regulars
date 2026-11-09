/* Regulars print kit: the shared drawings, so the brochure and the standee draw them the same way.
 *   REGULARS.mark()            the Quarter symbol (baked path, no mask) as an SVG string, cropped to the glyph
 *   REGULARS.lockup()          the symbol beside "Regulars" (live text; style with .lockup in tokens.css)
 *   REGULARS.weeks(weeks, o)   one member's 13 week marks in the app's light week colours: 3+ visits in the text
 *                              colour, 1 or 2 in #929294, a #929294 outline for none, a slipping week's red edge,
 *                              weeks not reached in #EDEDED
 *   REGULARS.statusMark(k)     a status's mark as inline SVG (sized in em by .rg-status svg): a filled dot for On the
 *                              line, a ring with its left half filled for Below the line, an empty ring for New, a
 *                              falling triangle for Slipping; only the triangle is red
 *   REGULARS.status(k)         the mark and the status word, in a .rg-status span
 *   REGULARS.board(o)          the board picture: the app's ground, a white card, one row per member (name and
 *                              status on top, the weeks below, a Nudge capsule on slipping rows), the Sample data tag
 *   REGULARS.days(visits, o)   a member's 90 days, 13 weeks x 7 days, a visit in the text colour
 * Sizes: the board's text scales with its container's font-size; marks are drawn at o.mark (any CSS length).
 * The rules come from the app's COPY.md: the line is 3 visits a week; On the line is 3 or more last week, Below the line
 * is 1 or 2, Slipping is two weeks in a row under 2. */
(function (root) {
  const C = {
    text: '#1D1D1F', soft: '#606068', low: '#929294', future: '#EDEDED', lineStrong: '#8C8C8D',
    tint: '#5444E4', slip: '#E0102E', dayEmpty: '#E5E5EA',
  }
  const r3 = (v) => Math.round(v * 1000) / 1000
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

  // the Quarter: a filled quarter circle with an L-shaped gap holding one rounded square (one week)
  const QUARTER = 'M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z'
  function mark({ quarter = C.text, square = C.tint, title = '' } = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4.4 4.4 15.2 15.2"${title ? ` role="img" aria-label="${esc(title)}"` : ' aria-hidden="true"'}>` +
      `<path d="${QUARTER}" fill="${quarter}"/><rect x="4.4" y="14.6" width="5" height="5" rx="1.3" fill="${square}"/></svg>`
  }
  // the lockup's inside: put it in an element with class "lockup" and set that element's font-size
  const lockup = () => `${mark()}<span>Regulars</span>`

  // sample gym (the old kit's six members; COPY.md home.board.member1-6)
  const SAMPLE = [
    { name: 'Maya R.', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3] },
    { name: 'Jo W.', weeks: [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3] },
    { name: 'Dev P.', weeks: [2, 3, 3, 4, 3, 3] },
    { name: 'Chris L.', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2] },
    { name: 'Hana L.', weeks: [3, 2, 2, 1, 1, 0] },
    { name: 'Sam O.', weeks: [2, 1, 0] },
  ]
  const isSlipping = (m) => m.weeks.length >= 2 && m.weeks.slice(-2).every((v) => v < 2)
  const STATUS = { on: 'On the line', below: 'Below the line', new: 'New', slip: 'Slipping' }
  function statusOf(m) {
    const k = !m.weeks.length ? 'new' : isSlipping(m) ? 'slip' : m.weeks[m.weeks.length - 1] >= 3 ? 'on' : 'below'
    return [k, STATUS[k]]
  }
  // the status marks on a 12-unit box (Uzair's pick, a11y-1): shapes tell the statuses apart, so colour never has to.
  // The dot, the half ring and the ring take the word's colour (currentColor: the text colour; the empty ring in
  // text-soft); the falling triangle is the only red mark.
  const SHAPE = {
    on: '<circle cx="6" cy="6" r="5" fill="currentColor"/>',
    below: '<circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 1A5 5 0 0 0 6 11Z" fill="currentColor"/>',
    new: `<circle cx="6" cy="6" r="4.4" fill="none" stroke="${C.soft}" stroke-width="1.2"/>`,
    slip: `<polygon points="1,1.7 11,1.7 6,10.3" fill="${C.slip}" stroke="${C.slip}" stroke-width="1" stroke-linejoin="round"/>`,
  }
  const statusMark = (k) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" aria-hidden="true">${SHAPE[k]}</svg>`
  const status = (k) => `<span class="rg-status st-${k}">${statusMark(k)}${STATUS[k]}</span>`
  // the slipping weeks: the run of weeks under 2 that ends the member's weeks, when the member is slipping
  function slipFrom(m) {
    if (!isSlipping(m)) return Infinity
    let i = m.weeks.length
    while (i > 0 && m.weeks[i - 1] < 2) i--
    return i
  }

  // one week mark at (x, 0), side 10 units; rx 2.6 matches the Quarter's square (1.3 of 5)
  const S = 10, GAP = 2.6, RX = 2.6
  function weekMark(x, v, slipping) {
    const rect = (inset, attrs) => `<rect x="${r3(x + inset)}" y="${r3(inset)}" width="${r3(S - 2 * inset)}" height="${r3(S - 2 * inset)}" rx="${r3(RX - inset)}" ${attrs}/>`
    let b = ''
    if (v == null) return rect(0, `fill="${C.future}"`)
    if (v >= 3) b = rect(0, `fill="${C.text}"`)
    else if (v >= 1) b = rect(0, `fill="${C.low}"`)
    else if (!slipping) b = rect(0.45, `fill="none" stroke="${C.low}" stroke-width="0.9"`)
    if (slipping) b += rect(0.6, `fill="none" stroke="${C.slip}" stroke-width="1.2"`)
    return b
  }
  const stripWidth = (n) => n * S + (n - 1) * GAP
  function weeks(m, { mark: size = '10px', count = 13, label = '' } = {}) {
    const from = slipFrom(m)
    let b = ''
    for (let c = 0; c < count; c++) b += weekMark(c * (S + GAP), c < m.weeks.length ? m.weeks[c] : null, c >= from && c < m.weeks.length)
    const w = stripWidth(count)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(w)} ${S}" style="height:${size};width:calc(${size} * ${r3(w / S)})"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${b}</svg>`
  }
  // the marks strip's width as a CSS length, for the day ruler
  const stripCss = (size, count = 13) => `calc(${size} * ${r3(stripWidth(count) / S)})`

  function board({ members = SAMPLE, mark: size, ruler = true, legend = true, tag = 'Sample data' } = {}) {
    let h = `<div class="rg-screen"><div class="rg-top"><span class="sample-tag">${esc(tag)}</span></div>`
    h += `<div class="rg-card">`
    if (ruler) {
      // Day 30, 60 and 90 over the week marks, each label ending at its third of the 13 weeks
      const W = stripCss(size)
      h += `<div class="rg-ruler" style="width:${W}">` + [1, 2, 3].map((k) => `<span style="left:calc(${W} * ${k} / 3)">Day ${k * 30}</span>`).join('') + `</div>`
    }
    members.forEach((m) => {
      const [k] = statusOf(m)
      h += `<div class="rg-row"><div class="rg-l1"><span class="rg-name">${esc(m.name)}</span>${status(k)}</div>`
      h += `<div class="rg-l2">${weeks(m, { mark: size })}${k === 'slip' ? '<span class="rg-nudge">Nudge</span>' : ''}</div></div>`
    })
    h += `</div>`
    if (legend) {
      const one = (v, slip) => `<svg viewBox="0 0 ${S} ${S}" style="width:${size};height:${size}">${weekMark(0, v, slip)}</svg>`
      h += `<div class="rg-legend"><span>${one(3)}3+ visits</span><span>${one(1)}1 or 2</span><span>${one(0)}None</span><span>${one(1, true)}Slipping</span></div>`
    }
    return h + `</div>`
  }

  // 90 days: 13 columns (weeks) x 7 rows (days); `visits` = day indices 0-89
  function days(visits, { width = '60mm' } = {}) {
    const s = 10, g = 3, set = new Set(visits)
    let b = ''
    for (let wk = 0; wk < 13; wk++) for (let d = 0; d < 7; d++) {
      const i = wk * 7 + d
      if (i >= 90) continue
      b += `<rect x="${wk * (s + g)}" y="${d * (s + g)}" width="${s}" height="${s}" rx="2.6" fill="${set.has(i) ? C.text : C.dayEmpty}"/>`
    }
    const w = 13 * s + 12 * g, h = 7 * s + 6 * g
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="display:block;width:${width};height:calc(${width} * ${r3(h / w)})" aria-hidden="true">${b}</svg>`
  }
  // a member who stays: 3 or 4 visits a week on varying days; a member who slips: fewer each week, nothing after day 31
  const STAYER = (() => {
    let sd = 7
    const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296), v = []
    for (let wk = 0; wk < 13; wk++) {
      const n = rnd() < 0.55 ? 3 : 4, picked = new Set()
      while (picked.size < n) picked.add(Math.floor(rnd() * 7))
      picked.forEach((d) => { const i = wk * 7 + d; if (i < 90) v.push(i) })
    }
    return v
  })()
  const SLIPPER = [0, 2, 4, 6, 8, 11, 13, 16, 19, 24, 31]

  root.REGULARS = { C, QUARTER, mark, lockup, SAMPLE, isSlipping, STATUS, statusOf, statusMark, status, weeks, stripCss, board, days, STAYER, SLIPPER }
})(typeof self !== 'undefined' ? self : this)

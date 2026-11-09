/* Local helper for the reel (candidate addition to brand/kit.js): the kit's board() and days() with per-frame state,
 * so the reel can build them cell by cell. With default options both return exactly the kit's SVG string
 * (checked by reel/test-board-live.mjs), so the geometry, colours and fonts cannot drift from the code.
 *   boardLive({ w, members, rowShown, rowReveal, paceShown, flagOn, chipScale })  rowShown/rowReveal/paceShown: arrays per row
 *   daysLive({ w, visits, upto })  draws only days 0..upto-1 (unreached days are not drawn, like the board's future weeks) */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports
  const T = isNode ? require('../brand/kit.js') : root.TENURE
  const api = factory(T)
  if (isNode) module.exports = api
  else root.TENURE_LIVE = api
})(typeof self !== 'undefined' ? self : this, function (T) {
  const { C, F } = T
  const r3 = (v) => Math.round(v * 1000) / 1000
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = (w, h, vb, body, unit = '', extra = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(w)}${unit}" height="${r3(h)}${unit}" viewBox="${vb}" ${extra}>${body}</svg>`
  const cellState = (v) => (v == null ? 'future' : v >= 3 ? 'on' : v >= 1 ? 'low' : 'none')
  function cellRect(x, y, s, state, flag) {
    const sw = s * 0.09
    if (state === 'future') return ''
    if (state === 'on') return `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${C.yellow}"/>` + (flag ? `<rect x="${r3(x + sw / 2)}" y="${r3(y + sw / 2)}" width="${r3(s - sw)}" height="${r3(s - sw)}" fill="none" stroke="${C.red}" stroke-width="${r3(sw)}"/>` : '')
    if (state === 'low') return `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${flag ? C.red : C.steel}"/>`
    return `<rect x="${r3(x + sw / 2)}" y="${r3(y + sw / 2)}" width="${r3(s - sw)}" height="${r3(s - sw)}" fill="none" stroke="${flag ? C.red : C.rubber3}" stroke-width="${r3(sw)}"/>`
  }

  function boardLive({ w, members = T.SAMPLE, weeks = 13, header = true, pace = true, status = true, highlight = 'Sam O.', reveal = Infinity,
    rowShown, rowReveal, paceShown, flagOn = true, chipScale = 1, unit = '' }) {
    const nameW = w * 0.19, statusW = status ? w * 0.17 : 0, paceW = pace ? w * 0.09 : 0
    const cellsW = w - nameW - paceW - statusW - w * 0.02
    const s = cellsW / (weeks + (weeks - 1) * 0.22), gap = s * 0.22
    const rowH = s * 1.62
    const x0 = nameW
    const headH = header ? s * 2.3 : 0
    const fs = s * 0.62
    let b = ''
    if (header) {
      const tH = s * 0.24, tY = s * 1.15
      b += `<g transform="translate(${r3(x0)} ${r3(tY)})">${T.tape({ w: cellsW, h: tH }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
      ;['DAY 30', 'DAY 60', 'DAY 90'].forEach((t, i) => {
        const xr = x0 + (cellsW * (i + 1)) / 3
        b += `<text x="${r3(xr)}" y="${r3(tY - s * 0.32)}" text-anchor="end" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">${t}</text>`
      })
      b += `<text x="0" y="${r3(tY + tH)}" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">NEW MEMBER</text>`
      if (pace) b += `<text x="${r3(x0 + cellsW + w * 0.02 + paceW)}" y="${r3(tY + tH)}" text-anchor="end" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.78)}" letter-spacing="${r3(fs * 0.78 * 0.14)}" fill="${C.steel}">PACE</text>`
    }
    members.forEach((m, ri) => {
      if (rowShown && !rowShown[ri]) return
      const y = headH + ri * rowH
      const flag = flagOn && T.isFlagged(m)
      const hi = flag && m.name === highlight
      const cy = y + (rowH - s) / 2
      const rv = rowReveal ? rowReveal[ri] : reveal
      b += `<text x="0" y="${r3(cy + s * 0.8)}" font-family="${F.label}" font-weight="600" font-size="${r3(fs * 1.18)}" letter-spacing="${r3(fs * 0.02)}" fill="${flag ? C.red : C.chalk}">${esc(m.name.toUpperCase())}</text>`
      for (let c = 0; c < weeks; c++) {
        const v = c < m.weeks.length && c < rv ? m.weeks[c] : null
        const lastTwo = flag && c >= m.weeks.length - 2
        b += cellRect(x0 + c * (s + gap), cy, s, cellState(v), lastTwo)
      }
      if (pace && (!paceShown || paceShown[ri])) b += `<text x="${r3(x0 + cellsW + w * 0.02 + paceW)}" y="${r3(cy + s * 0.8)}" text-anchor="end" font-family="${F.label}" font-weight="600" font-size="${r3(fs * 1.05)}" fill="${flag ? C.red : C.steel}">${T.paceOf(m).toFixed(1)}/WK</text>`
      if (status && flag) {
        const sx = w - statusW + w * 0.012
        if (hi) {
          const bw = statusW - w * 0.012, bh = s * 1.12
          const chip = `<rect x="${r3(sx)}" y="${r3(cy + (s - bh) / 2)}" width="${r3(bw)}" height="${r3(bh)}" fill="${C.yellow}"/>` +
            `<text x="${r3(sx + bw / 2)}" y="${r3(cy + s * 0.78)}" text-anchor="middle" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.95)}" letter-spacing="${r3(fs * 0.95 * 0.12)}" fill="${C.rubber}">NUDGE <tspan font-family="${F.display}" font-weight="400" letter-spacing="0">→</tspan></text>`
          if (chipScale === 1) b += chip
          else { const cx = sx + bw / 2, cyc = cy + s / 2; b += `<g transform="translate(${r3(cx)} ${r3(cyc)}) scale(${r3(chipScale)}) translate(${r3(-cx)} ${r3(-cyc)})">${chip}</g>` }
        } else {
          b += `<text x="${r3(sx)}" y="${r3(cy + s * 0.78)}" font-family="${F.label}" font-weight="700" font-size="${r3(fs * 0.95)}" letter-spacing="${r3(fs * 0.95 * 0.14)}" fill="${C.red}">SLIPPING</text>`
        }
      }
    })
    const h = headH + members.length * rowH
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }

  function daysLive({ w, visits = T.STAYER, color = C.yellow, upto = 90, unit = '' }) {
    const s = w / (13 + 12 * 0.25), gap = s * 0.25
    const set = new Set(visits)
    let b = ''
    for (let wk = 0; wk < 13; wk++) for (let d = 0; d < 7; d++) {
      const i = wk * 7 + d
      if (i >= 90 || i >= upto) continue
      const x = wk * (s + gap), y = d * (s + gap)
      b += set.has(i) ? `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${color}"/>` : `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(s)}" height="${r3(s)}" fill="${C.rubber3}"/>`
    }
    const h = 7 * s + 6 * gap
    return svg(w, h, `0 0 ${r3(w)} ${r3(h)}`, b, unit)
  }

  return { boardLive, daysLive }
})

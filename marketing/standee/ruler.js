/* Standee-local helper (candidate addition to brand/kit.js): the board's DAY 30 / 60 / 90 floor-tape ruler,
 * drawn at a label size the caller chooses instead of the kit's fixed fraction of the cell size.
 * At standee scale the kit's own header labels come out under 48 pt, so the board is drawn with header: false
 * and this ruler goes above it. Geometry matches TENURE.board({ w, pace: false, status: false }):
 * name column 19% of w, week cells over the next 79%, tape height 0.24 of a cell.
 * tracking is in em (0.14 in the kit; 0.09 here keeps the PDF text searchable as words).
 * Returns an SVG string. baseline = y of the labels' baseline, tapeTop = y of the tape's top edge (same unit as w). */
(function (root) {
  const T = root.TENURE
  const r3 = (v) => Math.round(v * 1000) / 1000
  function ruler({ w, labelPt, tracking = 0.14, baseline, tapeTop, weeks = 13, unit = "" }) {
    const x0 = w * 0.19
    const cellsW = w - x0 - w * 0.02
    const s = cellsW / (weeks + (weeks - 1) * 0.22)
    const tH = s * 0.24
    const h = tapeTop + tH
    let b = `<g transform="translate(${r3(x0)} ${r3(tapeTop)})">${T.tape({ w: cellsW, h: tH }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
    ;['DAY 30', 'DAY 60', 'DAY 90'].forEach((t, i) => {
      const xr = x0 + (cellsW * (i + 1)) / 3
      b += `<text x="${r3(xr)}" y="${r3(baseline)}" text-anchor="end" font-family="${T.F.label}" font-weight="700" font-size="${r3(labelPt)}" letter-spacing="${r3(labelPt * tracking)}" fill="${T.C.steel}">${t}</text>`
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(w)}${unit}" height="${r3(h)}${unit}" viewBox="0 0 ${r3(w)} ${r3(h)}">${b}</svg>`
  }
  root.STANDEE = { ruler }
})(window)

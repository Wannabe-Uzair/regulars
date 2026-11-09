/* Brochure-local helpers built on brand/kit.js (window.TENURE). Candidate additions to the design code.
 *
 * minText(svg, min): the kit sizes every board label as a fixed fraction of the board's width, so at the
 *   brochure's 84 mm live width some labels fall under 6 pt. This raises every font-size below `min` (in the
 *   SVG's own units) to `min`, scaling its letter-spacing by the same factor. Layout and colours are untouched.
 * boardPrint(opts, minPt): TENURE.board drawn in mm with no text under minPt.
 * legendPrint(opts): TENURE.legend in mm.
 */
(function (root) {
  const T = root.TENURE
  const PT = 25.4 / 72 // mm per pt

  function minText(svg, min) {
    return svg.replace(/font-size="([\d.]+)"(\s+letter-spacing="([\d.]+)")?/g, (m, fs, _ls, ls) => {
      fs = +fs
      if (fs >= min) return m
      const k = min / fs
      return `font-size="${min.toFixed(3)}"` + (ls != null ? ` letter-spacing="${(+ls * k).toFixed(3)}"` : '')
    })
  }
  const boardPrint = (opts, minPt = 6.3) => minText(T.board({ ...opts, unit: 'mm' }), minPt * PT)
  const legendPrint = (opts) => T.legend({ ...opts, unit: 'mm' })

  root.TENURE_PRINT = { PT, minText, boardPrint, legendPrint }
})(typeof self !== 'undefined' ? self : this)

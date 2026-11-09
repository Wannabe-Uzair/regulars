// Builds Tenure-pitch.pptx from what extract.mjs read out of slides.html.
//   node slides/make-pptx.cjs <build dir with layout.json + gfx/> <notes.md> <out.pptx>
// Geometry: the slide is 1920 px = 13.333 in, so 1 px = 1/144 in = 0.5 pt.
// Text: every word is a text box with 0 margins, the HTML's own line breaks (soft breaks), exact line spacing
// (CSS line height x 0.5 pt) and letter spacing in pt. PowerPoint puts the first baseline of an exactly spaced line
// at line height x ascent / (ascent + descent) (hhea) below the box top, so the box top = baseline - that.
// Boxes are 6% wider than the HTML so PowerPoint never re-wraps a line.
const path = require('path')
const fs = require('fs')
const PptxGenJS = require('pptxgenjs')
// the pptx skill's apply_theme.js writes the brand colours and fonts into the deck's theme; optional (only on machines that have it)
const THEME_JS = process.env.PPTX_SKILL_THEME
const applyTheme = THEME_JS && fs.existsSync(THEME_JS) ? require(THEME_JS).applyTheme : null

const [buildDir, notesFile, outFile] = process.argv.slice(2).map((p) => path.resolve(p))
const slides = JSON.parse(fs.readFileSync(path.join(buildDir, 'layout.json'), 'utf8'))
const IN = (px) => px / 144, PT = (px) => Math.round(px * 0.5 * 100) / 100

// hhea ascent share of each family (brand/fonts: Anton 2409/-674 per 2048; Barlow and Barlow Condensed 1000/-200 per 1000)
const ASC = { Anton: 2409 / (2409 + 674), Barlow: 1000 / 1200, 'Barlow Condensed': 1000 / 1200 }
// PowerPoint face names, from the fonts' name tables
function face(family, weight) {
  if (family === 'Anton') return { fontFace: 'Anton', bold: false }
  if (family === 'Barlow') return { 400: { fontFace: 'Barlow', bold: false }, 500: { fontFace: 'Barlow Medium', bold: false },
    600: { fontFace: 'Barlow SemiBold', bold: false }, 700: { fontFace: 'Barlow', bold: true } }[weight]
  if (family === 'Barlow Condensed') return { 600: { fontFace: 'Barlow Condensed SemiBold', bold: false }, 700: { fontFace: 'Barlow Condensed', bold: true } }[weight]
}

// notes.md: "## Slide N ..." headings, the text under each is that slide's notes
const notes = {}
let cur = null
for (const line of fs.readFileSync(notesFile, 'utf8').split('\n')) {
  const m = line.match(/^## Slide (\d+)/)
  if (m) { cur = +m[1]; notes[cur] = []; continue }
  if (line.startsWith('#')) cur = null
  else if (cur && line.trim()) notes[cur].push(line.trim())
}

const pres = new PptxGenJS()
pres.defineLayout({ name: 'TENURE_1920', width: 13.333, height: 7.5 })
pres.layout = 'TENURE_1920'
pres.title = 'Tenure pitch'
pres.author = 'Uzair Imran, Moiz Hamid, Zain ul Abideen, Ali Hassan'
pres.theme = { headFontFace: 'Anton', bodyFontFace: 'Barlow Medium' }
// two layouts: rubber (with the speckle texture, which is optional decoration and stays out of the way on the layout) and the yellow sign
pres.defineSlideMaster({ title: 'RUBBER', background: { color: '141414' },
  objects: [{ image: { x: 0, y: 0, w: 13.333, h: 7.5, path: path.join(buildDir, 'gfx', 'speckle.png') } }] })
pres.defineSlideMaster({ title: 'YELLOW', background: { color: 'FFD60A' } })

const report = []
slides.forEach((s, si) => {
  const yellow = s.ground === 'FFD60A'
  const slide = pres.addSlide({ masterName: yellow ? 'YELLOW' : 'RUBBER' })
  slide.background = { color: s.ground }
  for (const it of s.items) {
    const b = it.box
    if (it.kind === 'img') {
      slide.addImage({ path: path.join(buildDir, it.file), x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h), objectName: it.name, altText: it.name })
    } else if (it.kind === 'rect') {
      slide.addShape(pres.shapes.RECTANGLE, { x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h), fill: { color: it.fill }, line: { type: 'none' }, objectName: it.name })
    } else {
      const LH = it.lineHeight
      const big = it.lines[0].reduce((a, r) => (r.size > a.size ? r : a))
      const above = LH * ASC[big.family] // box top to first baseline, in PowerPoint
      const runs = []
      it.lines.forEach((line, li) => line.forEach((r, ri) => runs.push({ text: r.text, options: {
        ...face(r.family, r.weight), fontSize: PT(r.size), color: r.color, charSpacing: PT(r.ls), lineSpacing: PT(LH),
        ...(li > 0 && ri === 0 ? { softBreakBefore: true } : {}) } })))
      const textH = it.lines.length * LH
      let x, y, w, h, margin, extra = {}
      if (it.frame) { // a framed tag or the message bubble: one shape, its padding as insets, so the frame stays put
        const [pl, , pr] = it.frame.pad
        const top = it.baseline - b.y - above
        const contentW = b.w - pl - pr
        x = b.x; y = b.y; w = b.w; h = b.h
        margin = [pl, Math.max(0, pr - contentW * 0.06), 0, top] // px, order [left, right, bottom, top]
        if (it.frame.fill) extra.fill = { color: it.frame.fill }
        extra.line = it.frame.border ? { color: it.frame.border.color, width: PT(it.frame.border.w) } : { type: 'none' }
        report.push({ slide: si + 1, name: it.name, html: b, ppt: { x, y, w, h }, firstBaselineTopInset: top })
      } else {
        x = b.x; y = it.baseline - above; w = Math.min(b.w * 1.06, 1920 - b.x); h = textH; margin = [0, 0, 0, 0]
        report.push({ slide: si + 1, name: it.name, html: b, ppt: { x, y, w, h } })
      }
      slide.addText(runs, { x: IN(x), y: IN(y), w: IN(w), h: IN(h), margin: margin.map(PT), valign: 'top', align: 'left',
        wrap: true, fit: 'none', isTextBox: true, objectName: it.name, paraSpaceBefore: 0, paraSpaceAfter: 0, ...extra })
    }
  }
  if (!notes[si + 1] || !notes[si + 1].length) throw new Error(`no notes for slide ${si + 1}`)
  slide.addNotes(notes[si + 1].join('\n\n'))
})

const THEME = { name: 'Tenure Gym floor', headFontFace: 'Anton', bodyFontFace: 'Barlow Medium',
  colors: { dk1: '141414', lt1: 'EDEBE6', dk2: '1F1F1F', lt2: '8C9098', accent1: 'FFD60A', accent2: 'FF4B3E', accent3: '2B2B2B',
    accent4: '8C9098', accent5: 'EDEBE6', accent6: '1F1F1F', hlink: 'FFD60A', folHlink: '8C9098' } }

;(async () => {
  await pres.writeFile({ fileName: outFile })
  if (applyTheme) await applyTheme(outFile, THEME)
  else console.log('note: PPTX_SKILL_THEME not set, theme colours left at the pptxgenjs defaults (slides set every colour directly)')
  fs.writeFileSync(path.join(buildDir, 'boxes.json'), JSON.stringify(report, null, 1))
  console.log('wrote', outFile)
})()

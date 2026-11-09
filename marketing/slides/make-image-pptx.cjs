// The "present anywhere" deck: each slide is the exact PDF page as one full-bleed picture, with the same speaker notes.
// It looks right in PowerPoint, Keynote and Google Slides with no fonts installed. The words are not editable:
// edit slides.html and rebuild (bash slides/build.sh) instead.
//   node slides/make-image-pptx.cjs <dir with slide-1.png ... slide-8.png at 1920 x 1080> <notes.md> <out.pptx>
const path = require('path')
const fs = require('fs')
const PptxGenJS = require('pptxgenjs')

const [imgDir, notesFile, outFile] = process.argv.slice(2).map((p) => path.resolve(p))

// notes.md: "## Slide N ..." headings, the text under each is that slide's notes (same parser as make-pptx.cjs)
const notes = {}
let cur = null
for (const line of fs.readFileSync(notesFile, 'utf8').split('\n')) {
  const m = line.match(/^## Slide (\d+)/)
  if (m) { cur = +m[1]; notes[cur] = []; continue }
  if (line.startsWith('#')) cur = null
  else if (cur && line.trim()) notes[cur].push(line.trim())
}

const pres = new PptxGenJS()
pres.defineLayout({ name: 'REGULARS_1920', width: 13.333, height: 7.5 })
pres.layout = 'REGULARS_1920'
pres.title = 'Regulars pitch (picture slides)'
pres.author = 'Uzair Imran, Moiz Hamid, Zain ul Abideen, Ali Hassan'

const files = fs.readdirSync(imgDir).filter((f) => /^slide-\d+\.png$/.test(f))
  .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0])
if (files.length !== 8) throw new Error(`expected 8 slide images in ${imgDir}, found ${files.length}`)
files.forEach((f, i) => {
  const n = i + 1
  if (!notes[n] || !notes[n].length) throw new Error(`no notes for slide ${n}`)
  const slide = pres.addSlide()
  slide.background = { color: 'FFFFFF' }
  slide.addImage({ path: path.join(imgDir, f), x: 0, y: 0, w: 13.333, h: 7.5 })
  slide.addNotes(notes[n].join('\n\n'))
})
pres.writeFile({ fileName: outFile }).then((p) => console.log('wrote', p))

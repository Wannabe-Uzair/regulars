// Reads slides.html as drawn in Chrome and writes what the .pptx needs:
//   <out>/layout.json   every [data-ppt] element per slide: its box, and for text its runs, line breaks, first baseline and frame
//   <out>/gfx/s<N>-<i>.png   every data-ppt="img" element at 2x on a transparent background
//   <out>/gfx/speckle.png    the rubber speckle texture for a full slide, 2x, transparent
// usage: node slides/extract.mjs <slides.html> <outdir>
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
const here = path.dirname(new URL(import.meta.url).pathname)
const puppeteer = createRequire(path.join(here, '..', 'tools', 'package.json'))('puppeteer-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const [input, outDir] = process.argv.slice(2).map((p) => path.resolve(p))
fs.mkdirSync(path.join(outDir, 'gfx'), { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const page = await browser.newPage()
page.on('pageerror', (e) => { console.error('[page error]', e.message); process.exitCode = 1 })
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 })
await page.goto('file://' + input, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)
await page.waitForFunction('window.READY === true', { timeout: 60000 })

const slides = await page.evaluate(() => {
  const hex = (c) => { const m = c.match(/[\d.]+/g).map(Number); return m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase() }
  const px = (v) => (v === 'normal' ? 0 : parseFloat(v))
  const styleOf = (el) => {
    const cs = getComputedStyle(el)
    return { family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), weight: +cs.fontWeight, size: px(cs.fontSize),
      ls: px(cs.letterSpacing), color: hex(cs.color), upper: cs.textTransform === 'uppercase' }
  }
  return [...document.querySelectorAll('section.slide')].map((sec, si) => {
    const sr = sec.getBoundingClientRect()
    const scs = getComputedStyle(sec)
    const items = [...sec.querySelectorAll(':scope > [data-ppt]')].map((el, i) => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
      const it = { kind: el.dataset.ppt, name: el.dataset.name, i, box: { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height } }
      if (it.kind === 'img') { el.dataset.shot = `s${si + 1}-${i}`; it.file = `gfx/s${si + 1}-${i}.png` }
      if (it.kind === 'rect') it.fill = hex(cs.backgroundColor)
      if (it.kind !== 'text') return it
      // first baseline: a zero-size inline-block sits with its bottom on the first line's baseline
      const probe = document.createElement('span')
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
      el.insertBefore(probe, el.firstChild)
      it.baseline = probe.getBoundingClientRect().bottom - sr.top
      probe.remove()
      it.lineHeight = px(cs.lineHeight)
      if (el.dataset.frame) {
        it.frame = { fill: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? null : hex(cs.backgroundColor),
          border: px(cs.borderTopWidth) ? { w: px(cs.borderTopWidth), color: hex(cs.borderTopColor) } : null,
          pad: [px(cs.paddingLeft) + px(cs.borderLeftWidth), px(cs.paddingTop) + px(cs.borderTopWidth),
                px(cs.paddingRight) + px(cs.borderRightWidth), px(cs.paddingBottom) + px(cs.borderBottomWidth)] }
      }
      // runs per line: a character whose left edge jumps back starts a new line (flush-left text only)
      const lines = [[]]
      let prevLeft = -1e9
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n; (n = walker.nextNode());) {
        const st = styleOf(n.parentElement)
        const key = JSON.stringify(st)
        for (let k = 0; k < n.length; k++) {
          const rg = document.createRange(); rg.setStart(n, k); rg.setEnd(n, k + 1)
          const rc = rg.getClientRects()[0]
          if (!rc) continue // collapsed white space
          let ch = /\s/.test(n.data[k]) ? ' ' : n.data[k]
          if (st.upper) ch = ch.toUpperCase()
          let line = lines[lines.length - 1]
          if (rc.left < prevLeft - 0.5 && line.length) { lines.push([]); line = lines[lines.length - 1] }
          prevLeft = rc.left
          const last = line[line.length - 1]
          if (last && last.key === key) last.text += ch
          else line.push({ key, text: ch, ...st })
        }
      }
      it.lines = lines.map((l) => {
        l.forEach((r) => delete r.key)
        while (l.length && /^\s*$/.test(l[l.length - 1].text)) l.pop()
        if (l.length) l[l.length - 1].text = l[l.length - 1].text.replace(/\s+$/, '')
        if (l.length) l[0].text = l[0].text.replace(/^\s+/, '')
        return l
      }).filter((l) => l.length)
      return it
    })
    return { title: sec.dataset.title, ground: hex(scs.backgroundColor), speckle: scs.backgroundImage !== 'none', items }
  })
})
fs.writeFileSync(path.join(outDir, 'layout.json'), JSON.stringify(slides, null, 1))

// graphics: hide every ground, text and panel, then shoot each graphic on transparency
await page.addStyleTag({ content: `html,body,.slide{background:transparent!important;background-image:none!important}
  [data-ppt=text],[data-ppt=rect]{visibility:hidden!important}` })
for (const el of await page.$$('[data-shot]')) {
  const name = await el.evaluate((e) => e.dataset.shot)
  await el.screenshot({ path: path.join(outDir, 'gfx', name + '.png'), omitBackground: true })
}
// the speckle texture, one full slide of it
await page.evaluate(() => {
  document.querySelectorAll('section.slide').forEach((s) => { s.style.display = 'none' })
  const d = document.createElement('div'); d.id = 'speckle'
  d.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;background:url(../brand/assets/speckle-tile.svg) 0 0/512px 512px repeat'
  document.body.appendChild(d)
})
await (await page.$('#speckle')).screenshot({ path: path.join(outDir, 'gfx', 'speckle.png'), omitBackground: true })
await browser.close()
console.log('extracted', slides.length, 'slides,', slides.reduce((a, s) => a + s.items.length, 0), 'elements')

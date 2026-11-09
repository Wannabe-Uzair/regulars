// Present-mode check: opens slides.html?present in the installed Chrome (playwright-core, as tools/render-regulars.mjs
// drives it) and presses through the deck as a clicker would, checking that every slide and every build shows exactly
// once, in order, one slide at a time, scaled to fit the window and centred on black, with the film step right after
// slide 3. Then back through it, Home and End, a 16:10 window, and once more under reduced motion.
// The film step plays exports/Regulars-reel-16x9.mp4 full bleed on black, with no controls and its sound on: it must
// start from 0 when the step is reached, play, pause and rewind to 0 when you leave it (forward or back), and hold its
// last frame when it ends. Then three fallbacks, each on a copy of the deck made of links in build/present-check: a
// refused play() shows the centred Play button, which starts it; with no film the step shows the poster; with neither
// the step is skipped. Prints "present: <slides> slides, 1 film, <steps> steps, ok" (or "1 poster" or "no film", by
// what is in exports/).
//   node slides/present-check.mjs [dir]      (with a dir, also writes each step's picture at 1920 x 1080 there; the
//                                             film's is at 10 s)
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = path.dirname(new URL(import.meta.url).pathname)
const kit = path.dirname(here)
const FILM = 'Regulars-reel-16x9.mp4'
const POSTER = 'Regulars-reel-poster-16x9.png'
const urlOf = (dir) => 'file://' + path.join(dir, 'slides.html') + '?present'
const shots = process.argv[2] ? path.resolve(process.argv[2]) : null
if (shots) fs.mkdirSync(shots, { recursive: true })
const has = (f) => fs.existsSync(path.join(kit, 'exports', f))
const expectFilm = has(FILM) ? 'film' : has(POSTER) ? 'poster' : null

const FORWARD = ['ArrowRight', 'Space', 'PageDown', 'Enter']
const BACK = ['ArrowLeft', 'PageUp']
const problems = []
const fail = (msg) => problems.push(msg)

// What is on screen now: the slide and build the page says (or the film), which slides are actually visible, where
// the slide or the film sits in the window, and the film's own state.
const state = (page) => page.evaluate(() => {
  const visible = (el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height } }
  const slides = [...document.querySelectorAll('.slide')]
  const shown = slides.flatMap((s, i) => (visible(s) ? [i + 1] : []))
  const film = document.querySelector('.film')
  const v = film.querySelector('video')
  const img = film.querySelector('img')
  const btn = film.querySelector('.film-play')
  const onFilm = document.body.dataset.slide === 'film'
  const out = { film: onFilm, filmShown: visible(film), shown, win: { w: innerWidth, h: innerHeight },
    bg: getComputedStyle(document.body).backgroundColor,
    video: v && { src: v.getAttribute('src'), paused: v.paused, time: v.currentTime, duration: v.duration, ended: v.ended,
      controls: v.controls || v.hasAttribute('controls'), muted: v.muted, volume: v.volume, rect: box(v), fit: getComputedStyle(v).objectFit },
    poster: img && { src: img.getAttribute('src'), shown: visible(img) && img.naturalWidth > 0, rect: box(img) },
    button: { shown: visible(btn), rect: box(btn), bg: getComputedStyle(btn).backgroundColor },
    plays: window.PLAYS || [] }
  if (onFilm) return { ...out, slide: 'film', build: 0, rect: box(film), filmBg: getComputedStyle(film).backgroundColor, builds: [] }
  const cur = slides[+document.body.dataset.slide - 1]
  const builds = [...cur.querySelectorAll('[data-build]')].map((el) => [+el.dataset.build, visible(el)])
  return { ...out, slide: +document.body.dataset.slide, build: +document.body.dataset.build, builds, rect: box(cur) }
})
const key = (s) => (s.film ? 'film' : `${s.slide}.${s.build}`)
const near = (a, b, d = 1) => Math.abs(a - b) <= d
const fullWindow = (r, win) => near(r.left, 0) && near(r.top, 0) && near(r.width, win.w) && near(r.height, win.h)
const verify = (s, where) => {
  if (s.bg !== 'rgb(0, 0, 0)') fail(`${where}: the ground around the slide is ${s.bg}, not black`)
  if (s.film) {
    if (s.shown.length) fail(`${where}: slides ${JSON.stringify(s.shown)} on screen during the film`)
    if (!s.filmShown || !fullWindow(s.rect, s.win)) fail(`${where}: the film's stage is not the whole window`)
    if (s.filmBg !== 'rgb(0, 0, 0)') fail(`${where}: the film's stage is ${s.filmBg}, not black`)
    if (s.video) {
      if (!s.video.src.endsWith(`../exports/${FILM}`)) fail(`${where}: the film plays ${s.video.src}`)
      if (s.video.controls) fail(`${where}: the film shows controls`)
      if (s.video.muted || s.video.volume !== 1) fail(`${where}: the film's sound is off`)
      if (!fullWindow(s.video.rect, s.win) || s.video.fit !== 'contain') fail(`${where}: the film is not full bleed`)
    } else if (!s.poster || !s.poster.shown || !fullWindow(s.poster.rect, s.win)) fail(`${where}: no film and no poster shown`)
    return
  }
  if (s.filmShown) fail(`${where}: the film shows on a slide`)
  if (s.video && (!s.video.paused || s.video.time !== 0)) fail(`${where}: off the film it is ${s.video.paused ? 'paused' : 'playing'} at ${s.video.time} s, not paused at 0`)
  if (s.shown.length !== 1 || s.shown[0] !== s.slide) fail(`${where}: slides on screen ${JSON.stringify(s.shown)}, expected [${s.slide}]`)
  for (const [b, vis] of s.builds) if (vis !== b <= s.build) fail(`${where}: build ${b} ${vis ? 'shown' : 'hidden'} at step ${key(s)}`)
  const k = Math.min(s.win.w / 1920, s.win.h / 1080)
  if (!near(s.rect.width, 1920 * k) || !near(s.rect.height, 1080 * k)) fail(`${where}: slide is ${s.rect.width} x ${s.rect.height}, expected ${1920 * k} x ${1080 * k}`)
  if (!near(s.rect.left, (s.win.w - s.rect.width) / 2) || !near(s.rect.top, (s.win.h - s.rect.height) / 2)) fail(`${where}: slide not centred`)
}
// Just arrived on the film: it started from 0 (the last play began at 0) and is playing.
const arrived = (s, where) => {
  if (!s.video) return
  const from = s.plays.at(-1)
  if (from === undefined || from > 0.05) fail(`${where}: the film started at ${from} s, not 0`)
  if (s.video.paused) fail(`${where}: the film is not playing`)
  if (s.button.shown) fail(`${where}: the Play button shows while the film plays`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
// every play's starting time, for "starts at 0"
const RECORD_PLAYS = () => {
  window.PLAYS = []
  document.addEventListener('play', (e) => window.PLAYS.push(e.target.currentTime), true)
}
const open = async (dir, opts = {}) => {
  const context = await browser.newContext({ viewport: { width: opts.w || 1920, height: opts.h || 1080 }, reducedMotion: opts.motion || 'no-preference' })
  const page = await context.newPage()
  await page.addInitScript(RECORD_PLAYS)
  if (opts.refuse) await page.addInitScript(opts.refuse)
  const errors = []
  // a missing film or poster is a case the deck handles (the poster, or the skip): its load failure isn't a problem
  const reelFile = (u) => u.endsWith('/exports/' + FILM) || u.endsWith('/exports/' + POSTER)
  page.on('console', (m) => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && reelFile(m.location().url || ''))) errors.push(`${m.text()} (${m.location().url})`) })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(urlOf(dir), { waitUntil: 'load' })
  await page.waitForFunction('window.READY === true', null, { timeout: 60000 })
  const settle = async () => {
    await page.evaluate(() => window.PRESENT.settled())
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  }
  const info = await page.evaluate(() => ({ steps: window.PRESENT.steps, slides: window.PRESENT.slides, film: window.PRESENT.film }))
  return { context, page, errors, settle, ...info }
}
// presses forward from Home until the film step (or slide 4, where there is none)
const toFilm = async (page, settle) => {
  await page.keyboard.press('Home')
  await settle()
  for (let i = 0; i < 20; i++) {
    const s = await state(page)
    if (s.film || s.slide === 4) return s
    await page.keyboard.press('ArrowRight')
    await settle()
  }
  return state(page)
}

let summary = null
const fallbacks = []
try {
  for (const run of [{ w: 1920, h: 1080, motion: 'no-preference' }, { w: 1440, h: 900, motion: 'no-preference' }, { w: 1920, h: 1080, motion: 'reduce' }]) {
    const tag = `${run.w}x${run.h}${run.motion === 'reduce' ? ', reduced motion' : ''}`
    const { context, page, errors, settle, steps, slides, film } = await open(here, run)
    if (film !== expectFilm) fail(`${tag}: the film step is ${film}, expected ${expectFilm} from what is in exports/`)
    const firstShots = shots && run.w === 1920 && run.motion === 'no-preference'

    // forward, cycling through the clicker's keys, one press past the end
    const seen = []
    for (let i = 0; i < steps; i++) {
      if (i > 0) {
        await page.keyboard.press(FORWARD[(i - 1) % FORWARD.length])
        await settle()
      }
      let s = await state(page)
      verify(s, `${tag}, step ${i + 1}`)
      if (s.film && s.video) {
        arrived(s, `${tag}, step ${i + 1}`)
        await page.waitForTimeout(1200)
        s = await state(page)
        if (s.video.paused || s.video.time < 0.5) fail(`${tag}: the film is at ${s.video.time} s after 1.2 s, not playing`)
        if (firstShots) {
          await page.evaluate(() => new Promise((r) => {
            const v = document.querySelector('.film video')
            v.pause()
            v.addEventListener('seeked', () => requestAnimationFrame(() => requestAnimationFrame(r)), { once: true })
            v.currentTime = 10
          }))
        }
      }
      seen.push(key(s))
      if (firstShots) await page.screenshot({ path: path.join(shots, `present-${String(i + 1).padStart(2, '0')}-${s.film ? 'film-10s' : `slide-${s.slide}`}.png`) })
    }
    // the press past the end stays on the last step
    await page.keyboard.press('ArrowRight')
    await settle()
    if (key(await state(page)) !== seen.at(-1)) fail(`${tag}: a press past the end moved off the last step`)
    if (seen.length !== steps) fail(`${tag}: ${seen.length} steps shown, expected ${steps}`)
    if (new Set(seen).size !== seen.length) fail(`${tag}: a step showed twice: ${seen.join(' ')}`)
    const slideKeys = seen.filter((k) => k !== 'film')
    const slideOrder = [...new Set(slideKeys.map((k) => +k.split('.')[0]))]
    if (slideOrder.join() !== Array.from({ length: slides }, (_, i) => i + 1).join()) fail(`${tag}: slides in the order ${slideOrder.join(' ')}`)
    for (let n = 1; n <= slides; n++) {
      const builds = slideKeys.filter((k) => +k.split('.')[0] === n).map((k) => +k.split('.')[1])
      if (builds.join() !== [...builds].sort((a, b) => a - b).join()) fail(`${tag}: slide ${n}'s builds out of order`)
    }
    const f = seen.indexOf('film')
    const films = seen.filter((k) => k === 'film').length
    if (films !== (expectFilm ? 1 : 0)) fail(`${tag}: ${films} film steps, expected ${expectFilm ? 1 : 0}`)
    if (expectFilm && (!seen[f - 1].startsWith('3.') || !seen[f + 1].startsWith('4.'))) fail(`${tag}: the film comes after ${seen[f - 1]} and before ${seen[f + 1]}, not between slides 3 and 4`)

    // back through it, one step at a time; arriving on the film from slide 4 plays it from 0 again
    const back = [seen.at(-1)]
    for (let i = 0; i < steps - 1; i++) {
      await page.keyboard.press(BACK[i % BACK.length])
      await settle()
      const st = await state(page)
      verify(st, `${tag}, back ${i + 1}`)
      if (st.film && st.video) {
        arrived(st, `${tag}, back ${i + 1}`)
        await page.waitForTimeout(700)
      }
      back.push(key(st))
    }
    if (back.join() !== [...seen].reverse().join()) fail(`${tag}: going back showed ${back.join(' ')}`)

    // End and Home
    await page.keyboard.press('End')
    await settle()
    if (key(await state(page)) !== seen.at(-1)) fail(`${tag}: End is not the last step`)
    await page.keyboard.press('Home')
    await settle()
    if (key(await state(page)) !== seen[0]) fail(`${tag}: Home is not the first step`)

    // the film's end: it holds its last frame and stays on the step; forward then goes on to slide 4
    if (expectFilm === 'film' && run.w === 1920 && run.motion === 'no-preference') {
      await toFilm(page, settle)
      await page.evaluate(() => new Promise((r) => {
        const v = document.querySelector('.film video')
        v.addEventListener('ended', r, { once: true })
        v.currentTime = v.duration - 0.3
      }))
      await page.waitForTimeout(300)
      const s = await state(page)
      if (!s.film || !s.video.ended || !near(s.video.time, s.video.duration, 0.05)) fail(`${tag}: after its end the film is not held on its last frame (${key(s)}, ${s.video.time} of ${s.video.duration} s)`)
      await page.keyboard.press('ArrowRight')
      await settle()
      const after = await state(page)
      verify(after, `${tag}, after the film's end`)
      if (key(after) !== '4.0') fail(`${tag}: forward after the film's end showed ${key(after)}, not slide 4`)
    }

    if (errors.length) fail(`${tag}: page errors: ${errors.join(' | ')}`)
    summary = { slides, steps }
    await context.close()
  }

  // A refused play(): the browser says no to sound, so the centred Play button (64 px, the tint) shows; clicking it
  // starts the film without moving on; forward still goes on to slide 4.
  if (expectFilm === 'film') {
    const refuse = () => {
      const play = HTMLMediaElement.prototype.play
      let once = false
      HTMLMediaElement.prototype.play = function () {
        if (!once) { once = true; return Promise.reject(new DOMException('refused', 'NotAllowedError')) }
        return play.call(this)
      }
    }
    const { context, page, errors, settle } = await open(here, { refuse })
    let s = await toFilm(page, settle)
    await page.waitForTimeout(100)
    s = await state(page)
    const b = s.button
    const where = 'refused play'
    if (!s.film) fail(`${where}: no film step`)
    else {
      if (!s.video.paused) fail(`${where}: the film plays though play() was refused`)
      if (!b.shown) fail(`${where}: no Play button`)
      if (!near(b.rect.height, 64) || !near(b.rect.left + b.rect.width / 2, s.win.w / 2) || !near(b.rect.top + b.rect.height / 2, s.win.h / 2)) fail(`${where}: the Play button is not a centred 64 px capsule`)
      if (b.bg !== 'rgb(84, 68, 228)') fail(`${where}: the Play button is ${b.bg}, not the tint`)
      await page.mouse.click(b.rect.left + b.rect.width / 2, b.rect.top + b.rect.height / 2)
      await settle()
      await page.waitForTimeout(600)
      s = await state(page)
      if (!s.film) fail(`${where}: clicking Play left the film step (${key(s)})`)
      else if (s.video.paused || s.button.shown || s.video.time <= 0) fail(`${where}: clicking Play did not start the film`)
      await page.keyboard.press('PageDown')
      await settle()
      const after = await state(page)
      verify(after, `${where}, forward`)
      if (key(after) !== '4.0') fail(`${where}: forward showed ${key(after)}, not slide 4`)
    }
    if (errors.length) fail(`${where}: page errors: ${errors.join(' | ')}`)
    await context.close()

    // The same refusal, with the clicker: the forward key plays the film and stays on the step; the next one goes on.
    {
      const key2 = await open(here, { refuse })
      await toFilm(key2.page, key2.settle)
      await key2.page.waitForTimeout(100)
      const w2 = 'refused play, forward key'
      if (!(await state(key2.page)).button.shown) fail(`${w2}: no Play button`)
      await key2.page.keyboard.press('PageDown')
      await key2.settle()
      await key2.page.waitForTimeout(600)
      let t = await state(key2.page)
      if (!t.film || t.video.paused || t.button.shown) fail(`${w2}: the key did not play the film on its step (${key(t)}, paused ${t.video.paused}, button ${t.button.shown})`)
      await key2.page.keyboard.press('PageDown')
      await key2.settle()
      t = await state(key2.page)
      verify(t, w2)
      if (key(t) !== '4.0') fail(`${w2}: the second key showed ${key(t)}, not slide 4`)
      if (key2.errors.length) fail(`${w2}: page errors: ${key2.errors.join(' | ')}`)
      await key2.context.close()
    }
    fallbacks.push('a refused play')
  }

  // No film, then neither the film nor its poster: the deck made of links, with exports/ holding only what the case
  // needs (the poster case links the real poster, or a slide picture where the poster isn't rendered yet).
  const stage = path.join(kit, 'build', 'present-check')
  fs.rmSync(stage, { recursive: true, force: true })
  try {
    for (const c of [{ name: 'the poster', poster: true }, { name: 'the skip', poster: false }]) {
      const dir = path.join(stage, c.poster ? 'poster' : 'skip')
      fs.mkdirSync(path.join(dir, 'slides'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'exports'))
      fs.symlinkSync(path.join(kit, 'brand'), path.join(dir, 'brand'))
      fs.symlinkSync(path.join(here, 'slides.html'), path.join(dir, 'slides', 'slides.html'))
      fs.symlinkSync(path.join(here, 'shots'), path.join(dir, 'slides', 'shots'))
      if (c.poster) fs.symlinkSync(has(POSTER) ? path.join(kit, 'exports', POSTER) : path.join(here, 'shots', 'board-laptop.png'), path.join(dir, 'exports', POSTER))
      const { context, page, errors, settle, steps, film } = await open(path.join(dir, 'slides'))
      const where = `${c.name} (exports/ with ${c.poster ? 'the poster only' : 'neither'})`
      if (film !== (c.poster ? 'poster' : null)) fail(`${where}: the film step is ${film}`)
      const want = summary.steps - (expectFilm ? 1 : 0) + (c.poster ? 1 : 0)
      if (steps !== want) fail(`${where}: ${steps} steps, expected ${want}`)
      const s = await toFilm(page, settle)
      verify(s, where)
      if (c.poster && !s.film) fail(`${where}: no poster step after slide 3`)
      if (!c.poster && key(s) !== '4.0') fail(`${where}: after slide 3 comes ${key(s)}, not slide 4`)
      if (c.poster) {
        await page.keyboard.press('ArrowRight')
        await settle()
        const after = await state(page)
        verify(after, `${where}, forward`)
        if (key(after) !== '4.0') fail(`${where}: forward showed ${key(after)}, not slide 4`)
      }
      if (errors.length) fail(`${where}: page errors: ${errors.join(' | ')}`)
      await context.close()
      fallbacks.push(c.name)
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true })
  }
} finally {
  await browser.close()
}

for (const p of problems) console.error('  ' + p)
if (problems.length || !summary) {
  console.log(`present: ${problems.length} problems`)
  process.exit(1)
}
console.log(`fallbacks: ${fallbacks.join(', ')}, ok`)
console.log(`present: ${summary.slides} slides, ${expectFilm ? `1 ${expectFilm}` : 'no film'}, ${summary.steps} steps, ok`)

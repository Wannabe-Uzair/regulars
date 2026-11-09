// Chrome rounds a PDF's page size to its print raster (A4 comes out 594.96 x 841.92 pt). This rewrites the one page's
// MediaBox to exact A4, 595.28 x 841.89 pt, in place and at the same byte length, so the xref offsets stay valid.
// The page ground is white paper, so the 0.32 pt this adds on the right edge is blank like the rest of the margin.
//   node stall/fix-a4.mjs <file.pdf>
import fs from 'node:fs'
const file = process.argv[2]
const buf = fs.readFileSync(file)
const s = buf.toString('latin1')
const boxes = [...s.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
if (boxes.length !== 1) { console.error(`fix-a4: expected 1 MediaBox, found ${boxes.length}`); process.exit(1) }
const [m, w, h] = boxes[0]
const dec = Math.max(w.split('.')[1]?.length ?? 0, h.split('.')[1]?.length ?? 0, 2)
const next = `/MediaBox [0 0 ${(595.28).toFixed(dec)} ${(841.89).toFixed(dec)}]`
if (Math.abs(+w - 595.28) > 1 || Math.abs(+h - 841.89) > 1) { console.error(`fix-a4: page is ${w} x ${h} pt, not A4`); process.exit(1) }
if (next.length !== m.length) { console.error(`fix-a4: cannot rewrite "${m}" at the same length`); process.exit(1) }
fs.writeFileSync(file, Buffer.from(s.replace(m, next), 'latin1'))
console.log(`fix-a4: ${w} x ${h} -> 595.28 x 841.89 pt`)

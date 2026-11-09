// WCAG 2.x contrast, ported from docs/research/colour-round-2/scripts/contrast.mjs.

/** `#RGB` or `#RRGGBB` → sRGB channels in 0–1. */
function channels(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** Relative luminance (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio between two hex colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// OKLab mixing, as CSS `color-mix(in oklab, …)` does it (Björn Ottosson's matrices, as in CSS Color 4).

type Triple = [number, number, number]

const delinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function toOklab(hex: string): Triple {
  const [r, g, b] = channels(hex).map(linear) as Triple
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function fromOklab([L, a, b]: Triple): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const byte = (c: number) => Math.round(Math.min(1, Math.max(0, delinear(c))) * 255)
  return `#${rgb.map((c) => byte(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

/** `color-mix(in oklab, a pct%, b)` → hex. */
export function mixOklab(a: string, pct: number, b: string): string {
  const [x, y] = [toOklab(a), toOklab(b)]
  const p = pct / 100
  return fromOklab(x.map((v, i) => v * p + (y[i] as number) * (1 - p)) as Triple)
}

const varPattern = /^var\(--color-([a-z-]+)\)$/
const mixPattern = /^color-mix\(in oklab, (.+) (\d+(?:\.\d+)?)%, (.+)\)$/

/**
 * A theme colour as hex: a hex value, `var(--color-<role>)` or `color-mix(in oklab, <colour> <n>%, <colour>)`,
 * resolved against the rest of the palette the way the browser does.
 */
export function resolveColor(palette: Readonly<Record<string, string>>, value: string): string {
  if (value.startsWith('#')) return value
  const ref = varPattern.exec(value)
  if (ref) {
    const target = palette[ref[1] as string]
    if (target === undefined) throw new Error(`unknown colour role: ${value}`)
    return resolveColor(palette, target)
  }
  const mix = mixPattern.exec(value)
  if (mix) {
    const [, a, pct, b] = mix as unknown as [string, string, string, string]
    return mixOklab(resolveColor(palette, a), Number(pct), resolveColor(palette, b))
  }
  throw new Error(`cannot resolve colour: ${value}`)
}

const tintPattern = /^color-mix\(in oklab, (.+) (\d+(?:\.\d+)?)%, transparent\)$/

/**
 * A theme colour as it shows on `ground` (hex). A translucent `color-mix(in oklab, <colour> <n>%, transparent)` is
 * `<colour>` at n% alpha, painted over the ground in sRGB the way the browser composites it; any other value is
 * opaque and resolves as `resolveColor` does.
 */
export function resolveOver(palette: Readonly<Record<string, string>>, value: string, ground: string): string {
  const tint = tintPattern.exec(value)
  if (!tint) return resolveColor(palette, value)
  const [, colour, pct] = tint as unknown as [string, string, string]
  const a = Number(pct) / 100
  const [top, under] = [channels(resolveColor(palette, colour)), channels(resolveColor(palette, ground))]
  const byte = (i: number) => Math.round(((top[i] as number) * a + (under[i] as number) * (1 - a)) * 255)
  return `#${[0, 1, 2].map((i) => byte(i).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

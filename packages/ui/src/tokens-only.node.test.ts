// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const src = new URL('./', import.meta.url)
const modules = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.module.css'))
  .sort()

/** Literals a component's CSS must take from tokens.css instead (docs/ARCHITECTURE.md §9). */
const literals: [what: string, pattern: RegExp][] = [
  ['a hex colour', /#[0-9a-f]{3,8}\b/i],
  ['a duration in ms', /\d+ms\b/],
  ['a z-index', /z-index:\s*-?\d/],
  ['an opacity decimal', /opacity:\s*-?\d*\.\d/],
]

/** The CSS named colours (CSS Color 4), which a value must take from a `--color-*` token too. */
const namedColours = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
  cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
  midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue
  slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow
  yellowgreen`.split(/\s+/),
)

/**
 * The named colours in a stylesheet's declaration values. Comments and selectors are left out, and so are words inside
 * a longer name (`--color-text`, `radial-gradient`); `transparent` and `currentColor` aren't named colours.
 */
function namedColoursIn(css: string): string[] {
  const values = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\{([^{}]*)\}/g)].flatMap((block) =>
    (block[1] ?? '').split(';').map((declaration) => declaration.slice(declaration.indexOf(':') + 1)),
  )
  return values
    .flatMap((value) => [...value.matchAll(/(?<![\w-])[a-z]+(?![\w-])/gi)].map((m) => m[0].toLowerCase()))
    .filter((word) => namedColours.has(word))
}

/** The mesh keeps its canvas recipe in its own file; everything else takes state colours from tokens. */
const ownsItsMixes = new Set(['MeshBackground/MeshBackground.module.css'])

describe('component CSS uses tokens only', () => {
  test('finds the component modules', () => {
    expect(modules.length).toBeGreaterThan(10)
  })

  test.each(modules)('%s has no literal colour, duration, z-index or opacity', (file) => {
    const css = readFileSync(new URL(file, src), 'utf8')
    for (const [what, pattern] of literals) expect(pattern.exec(css)?.[0], `${file} has ${what}`).toBeUndefined()
    expect(namedColoursIn(css), `${file} has a named colour`).toEqual([])
  })

  test('the named-colour check finds a name in a value, and leaves token names, selectors and comments alone', () => {
    const css = `/* white */\n.white-space {\n  --mesh: light-dark(\n    color-mix(in oklab, var(--color-bg) 45%, White),\n    var(--color-tan)\n  );\n  border: 1px solid transparent;\n  color: currentColor;\n  white-space: nowrap;\n}`
    expect(namedColoursIn(css)).toEqual(['white'])
  })

  test.each(modules.filter((file) => !ownsItsMixes.has(file)))('%s takes its state colours from tokens', (file) => {
    const css = readFileSync(new URL(file, src), 'utf8')
    expect(css, `${file} mixes a colour inline; add a --color-* token`).not.toContain('color-mix(')
  })
})

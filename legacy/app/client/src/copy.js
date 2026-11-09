// Every word on screen comes from tenure/app/COPY.md (built into copy.generated.json by scripts/copy-from-md.mjs).
// t('kiosk.welcome.back', { FIRST: 'SAM', n: 4 }) fills {placeholders}. If an id is missing, the fallback is shown
// and a warning is logged in development, so a missing string is visible but never breaks a screen.
import strings from './copy.generated.json'

export function t(id, vars = {}, fallback) {
  let s = strings[id]
  if (s == null) {
    if (import.meta.env?.DEV) console.warn(`copy: missing "${id}" in COPY.md`)
    s = fallback ?? id
  }
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export const has = (id) => id in strings

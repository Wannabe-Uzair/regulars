/**
 * Copies text to the clipboard, and says whether it worked. The clipboard API needs a secure context, which the stall
 * laptop's plain-http LAN address isn't, so without it (or when it refuses) a hidden textarea and `execCommand('copy')`
 * do the copy instead, as the old app did.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText === 'function' && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Refused (no permission, or the page lost focus): the fallback may still work.
  }
  return copyWithCommand(text)
}

function copyWithCommand(text: string): boolean {
  const focused = document.activeElement
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.setAttribute('aria-hidden', 'true')
  // Out of sight but in the page, and at 16 px so iOS doesn't zoom to it.
  Object.assign(area.style, { position: 'fixed', insetBlockStart: '0', opacity: '0', fontSize: '16px' })
  document.body.append(area)
  // Focused first: some browsers copy only from a focused selection.
  area.focus({ preventScroll: true })
  area.select()
  // iOS Safari selects nothing with select() alone.
  area.setSelectionRange(0, text.length)
  let copied = false
  try {
    copied = typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    // The browser refused the command: nothing was copied.
  }
  area.remove()
  // Selecting the textarea took focus; give it back, so a keyboard user stays on the Copy button.
  if (focused instanceof HTMLElement) focused.focus()
  return copied
}

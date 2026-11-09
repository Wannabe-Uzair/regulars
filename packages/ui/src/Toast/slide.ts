/** Each toast's top edge on screen, by its id, for the toasts in the stack now. */
export type Places = Map<number, number>

const toastsIn = (stack: HTMLElement) => [...stack.querySelectorAll<HTMLElement>(':scope > [data-toast-id]')]
const idOf = (toast: HTMLElement) => Number(toast.dataset.toastId)

/**
 * Notes where each toast in the stack stands, just before the stack changes. A toast already noted keeps its first
 * place, so changes in the same frame slide from where the person last saw it.
 */
export function notePlaces(stack: HTMLElement | null, places: Places): void {
  if (!stack) return
  for (const toast of toastsIn(stack)) {
    if (!places.has(idOf(toast))) places.set(idOf(toast), toast.getBoundingClientRect().top)
  }
}

/**
 * Makes room smoothly (pick G2): each noted toast that the change moved starts back where it stood, and the stack's
 * CSS transition on `translate` carries it to its new place over --motion-base. Only when motion is welcome does the
 * CSS have that transition, so under reduced motion the toasts simply stand in their new places. A newcomer has no
 * noted place, so it keeps its own entrance. `translate` stays apart from the entrance's `transform`, so a toast still
 * rising can slide too.
 */
export function slideFrom(stack: HTMLElement | null, places: Places): void {
  if (!stack || places.size === 0) return
  const moved = toastsIn(stack).filter((toast) => places.has(idOf(toast)))
  // Stop any slide still running, so each toast measures at its new place in the layout.
  for (const toast of moved) toast.style.setProperty('transition', 'none')
  const offsets = moved.map((toast) => (places.get(idOf(toast)) ?? 0) - toast.getBoundingClientRect().top)
  moved.forEach((toast, i) => {
    const offset = offsets[i] ?? 0
    if (Math.abs(offset) >= 0.5) toast.style.setProperty('translate', `0 ${offset}px`)
  })
  // Lay the start out, then hand back to the CSS transition, which carries each one home.
  void stack.offsetHeight
  for (const toast of moved) {
    toast.style.removeProperty('transition')
    toast.style.removeProperty('translate')
  }
  places.clear()
}

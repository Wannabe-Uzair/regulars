/** Loads the page again from the server: the only way to retry a lazy chunk, since the router keeps a failed load. */
export function reloadPage(): void {
  window.location.reload()
}

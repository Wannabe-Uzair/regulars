/**
 * Sets `data-theme` on <html> before the first paint. Inline it as the text of a classic (not module) <script> in
 * <head>, before any stylesheet. The page is pinned light (ARCHITECTURE §9, "One light theme"): it sets light whatever
 * was stored or the device prefers, as `readThemeSetting` does.
 */
export const themeBootScript = `document.documentElement.setAttribute("data-theme","light")`

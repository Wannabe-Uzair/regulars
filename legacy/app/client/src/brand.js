// The brand, imported straight from tenure/brand/ (alias @brand in vite.config.js). Never copy these files.
// wordmark.js and kit.js are UMD scripts that set window.TENURE; importing them here, first, guarantees
// T is ready for every module that imports this one.
import '@brand/wordmark.js'
import '@brand/kit.js'

export const T = window.TENURE

import { existsSync } from 'node:fs'
import { Config } from '@remotion/cli/config'

/** Render with the Chrome on this Mac when it is there; otherwise Remotion fetches its own headless shell. */
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (existsSync(chrome)) Config.setBrowserExecutable(chrome)

/** Four tabs at most: the Mac is shared. */
Config.setConcurrency(4)
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)

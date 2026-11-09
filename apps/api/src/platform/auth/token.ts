// Random tokens (sessions, kiosk links, invites) and the sha256 the database stores in their place.
import { createHash, randomBytes } from 'node:crypto'

/** 32 random bytes, base64url: 43 characters. */
export const newToken = () => randomBytes(32).toString('base64url')

/** Hex sha256. Only this is stored, never the token. */
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

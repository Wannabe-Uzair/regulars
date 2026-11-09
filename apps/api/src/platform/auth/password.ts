// Passwords: scrypt, stored as 'scrypt$N$r$p$salt$hash' (salt and hash base64url), the old server's format.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  )

const SCRYPT = { N: 16384, r: 8, p: 1 }
const KEYLEN = 32

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEYLEN, SCRYPT)
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/** True when `password` matches `stored`. A stored value not in the format is false. The compare is timing-safe. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [N, r, p] = parts.slice(1, 4).map(Number) as [number, number, number]
  const salt = Buffer.from(parts[4] ?? '', 'base64url')
  const expected = Buffer.from(parts[5] ?? '', 'base64url')
  if (!expected.length) return false
  const key = await scrypt(password, salt, expected.length, { N, r, p, maxmem: 256 * N * r })
  return timingSafeEqual(key, expected)
}

let dummyHash: Promise<string> | undefined

/**
 * A real scrypt hash of a random password: a login for an unknown or inactive email verifies against it, so it takes
 * as long as a wrong password for a real account.
 */
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('base64url')))

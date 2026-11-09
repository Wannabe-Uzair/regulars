import { describe, expect, test } from 'vitest'
import { dummyPasswordHash, hashPassword, verifyPassword } from './password.ts'
import { newToken, sha256 } from './token.ts'

describe('passwords', () => {
  test('scrypt hash round trip in the scrypt$N$r$p$salt$hash format', async () => {
    const h = await hashPassword('hunter2-hunter2')
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$[\w-]{22}\$[\w-]{43}$/)
    expect(await verifyPassword('hunter2-hunter2', h)).toBe(true)
    expect(await verifyPassword('hunter2-hunter3', h)).toBe(false)
    expect(await hashPassword('hunter2-hunter2'), 'salted').not.toBe(h)
  })

  test.each([
    ['garbage', 'garbage'],
    ['another scheme', 'bcrypt$16384$8$1$c2FsdA$aGFzaA'],
    ['too few parts', 'scrypt$16384$8$1$c2FsdA'],
    ['an empty hash', 'scrypt$16384$8$1$c2FsdA$'],
  ])('a stored value that is %s never verifies', async (_, stored) => {
    expect(await verifyPassword('x', stored)).toBe(false)
  })

  test('verifies a hash the old server stored (same format and parameters)', async () => {
    // The legacy hashPassword('hunter2-hunter2') with this salt; see legacy/app/server/auth.mjs.
    const salt = Buffer.from('0123456789abcdef').toString('base64url')
    const { scryptSync } = await import('node:crypto')
    const key = scryptSync('hunter2-hunter2', Buffer.from(salt, 'base64url'), 32, { N: 16384, r: 8, p: 1 })
    expect(await verifyPassword('hunter2-hunter2', `scrypt$16384$8$1$${salt}$${key.toString('base64url')}`)).toBe(true)
  })

  test('the dummy hash is one real scrypt hash, made once', async () => {
    const a = await dummyPasswordHash()
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$/)
    expect(await dummyPasswordHash()).toBe(a)
  })
})

describe('tokens', () => {
  test('a token is 32 random bytes as base64url; sha256 is hex', () => {
    expect(newToken()).toMatch(/^[\w-]{43}$/)
    expect(newToken()).not.toBe(newToken())
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

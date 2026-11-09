import { describe, expect, test } from 'vitest'
import { smsUrl, whatsappUrl } from './sms.ts'

test('smsUrl uses the ?& form and encodes the body', () => {
  expect(smsUrl('+13125550142', "Hi Sam, it's Mike & co. 6 pm? 100%")).toBe(
    "sms:+13125550142?&body=Hi%20Sam%2C%20it's%20Mike%20%26%20co.%206%20pm%3F%20100%25",
  )
})

test('smsUrl encodes line breaks and non-ASCII', () => {
  expect(smsUrl('+13125550142', 'a\nb é')).toBe('sms:+13125550142?&body=a%0Ab%20%C3%A9')
})

test('smsUrl is null without a phone', () => {
  expect(smsUrl(null, 'Hi')).toBeNull()
  expect(smsUrl(undefined, 'Hi')).toBeNull()
  expect(smsUrl('', 'Hi')).toBeNull()
})

describe('whatsappUrl', () => {
  test('FR-NUDGE-03 drops the + and encodes the message as the Text link does', () => {
    const body = "Hi Sam, it's Mike & co. 6 pm? 100%"
    expect(whatsappUrl('+13125550142', body)).toBe(
      "https://wa.me/13125550142?text=Hi%20Sam%2C%20it's%20Mike%20%26%20co.%206%20pm%3F%20100%25",
    )
    expect(whatsappUrl('+13125550142', body)?.split('?text=')[1]).toBe(smsUrl('+13125550142', body)?.split('?&body=')[1])
  })

  test('FR-NUDGE-03 encodes line breaks and non-ASCII', () => {
    expect(whatsappUrl('+13125550142', 'a\nb é')).toBe('https://wa.me/13125550142?text=a%0Ab%20%C3%A9')
  })

  test.each([
    ['the UK', '+442079460958', '442079460958'],
    ['Pakistan', '+923001234567', '923001234567'],
    ['the UAE', '+971501234567', '971501234567'],
  ])('FR-NUDGE-03 takes a stored number from %s, never as wa.me/+ or wa.me/0', (_, phone, digits) => {
    const url = whatsappUrl(phone, 'Hi')
    expect(url).toBe(`https://wa.me/${digits}?text=Hi`)
    expect(url).not.toMatch(/wa\.me\/[+0]/)
  })

  test('FR-NUDGE-04 is null without a phone, like the Text link', () => {
    expect(whatsappUrl(null, 'Hi')).toBeNull()
    expect(whatsappUrl(undefined, 'Hi')).toBeNull()
    expect(whatsappUrl('', 'Hi')).toBeNull()
  })
})

// The development stand-in: keeps each message in an in-memory outbox and logs one line. Nothing leaves the machine.
import type { Log } from '../log.ts'
import type { SmsMessage, SmsPort } from './port.ts'

export type DevSms = SmsPort & { readonly outbox: readonly SmsMessage[] }

export function createDevSms(log: Log): DevSms {
  const outbox: SmsMessage[] = []
  return {
    outbox,
    async send(message) {
      outbox.push({ ...message })
      log(`[dev sms] to ${message.to}: ${message.body.length} chars`)
      return { id: `dev-sms-${outbox.length}` }
    },
  }
}

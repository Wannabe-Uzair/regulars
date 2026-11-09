// The development stand-in: keeps each message in an in-memory outbox and logs one line. Nothing leaves the machine.
import type { Log } from '../log.ts'
import type { EmailMessage, EmailPort } from './port.ts'

export type DevEmail = EmailPort & { readonly outbox: readonly EmailMessage[] }

export function createDevEmail(log: Log): DevEmail {
  const outbox: EmailMessage[] = []
  return {
    outbox,
    async send(message) {
      outbox.push({ ...message })
      log(`[dev email] to ${message.to}: ${message.subject}`)
      return { id: `dev-email-${outbox.length}` }
    },
  }
}

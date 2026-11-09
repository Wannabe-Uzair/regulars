// The outside services behind ports. main.ts picks the providers; until real ones plug in (Resend, Twilio, Stripe)
// every environment gets the dev stand-ins. Nothing calls them yet.
import { createDevEmail, type DevEmail } from './email/dev.ts'
import type { EmailPort } from './email/port.ts'
import type { Log } from './log.ts'
import { createDevPayments, type DevPayments } from './payments/dev.ts'
import type { PaymentsPort } from './payments/port.ts'
import { createDevSms, type DevSms } from './sms/dev.ts'
import type { SmsPort } from './sms/port.ts'

export type { EmailMessage, EmailPort } from './email/port.ts'
export type { CheckoutRequest, PaymentsPort, PortalRequest } from './payments/port.ts'
export type { SmsMessage, SmsPort } from './sms/port.ts'

export type Adapters = { email: EmailPort; sms: SmsPort; payments: PaymentsPort }

/** The dev stand-ins, with their outboxes visible. */
export type DevAdapters = { email: DevEmail; sms: DevSms; payments: DevPayments }

export function createDevAdapters(log: Log = console.log): DevAdapters {
  return { email: createDevEmail(log), sms: createDevSms(log), payments: createDevPayments(log) }
}

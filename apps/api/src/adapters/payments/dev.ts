// The development stand-in: records each request in an in-memory outbox, logs one line, and sends the owner straight
// back (checkout "succeeds" at once). Nothing leaves the machine.
import type { Log } from '../log.ts'
import type { CheckoutRequest, PaymentsPort, PortalRequest } from './port.ts'

export type PaymentsRecord = ({ kind: 'checkout' } & CheckoutRequest) | ({ kind: 'portal' } & PortalRequest)

export type DevPayments = PaymentsPort & { readonly outbox: readonly PaymentsRecord[] }

export function createDevPayments(log: Log): DevPayments {
  const outbox: PaymentsRecord[] = []
  return {
    outbox,
    async startCheckout(request) {
      outbox.push({ kind: 'checkout', ...request })
      log(`[dev payments] checkout for gym ${request.gymId}, plan ${request.plan}`)
      return { url: request.successUrl }
    },
    async portalUrl(request) {
      outbox.push({ kind: 'portal', ...request })
      log(`[dev payments] billing portal for gym ${request.gymId}`)
      return { url: request.returnUrl }
    },
  }
}

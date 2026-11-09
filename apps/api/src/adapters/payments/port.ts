// Payments: the gym's subscription (M3). The provider hosts both pages; we only hand out their URLs.
export type CheckoutRequest = {
  gymId: number
  /** The plan being bought, as the gym row names it. */
  plan: string
  /** The owner's email, to prefill the provider's page. */
  email: string
  /** Where the provider sends the owner back after paying, and after giving up. */
  successUrl: string
  cancelUrl: string
}

export type PortalRequest = { gymId: number; returnUrl: string }

export type PaymentsPort = {
  /** A hosted checkout page for the gym's plan. */
  startCheckout(request: CheckoutRequest): Promise<{ url: string }>
  /** The hosted billing page where the owner manages or cancels the subscription. */
  portalUrl(request: PortalRequest): Promise<{ url: string }>
}

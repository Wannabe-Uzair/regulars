// SMS: nudges sent from the gym's number (M3). Nudges still open the coach's own phone by default.
export type SmsMessage = { to: string; body: string }

export type SmsPort = {
  /** Resolves once the provider has accepted the message; `id` is the provider's id for it. */
  send(message: SmsMessage): Promise<{ id: string }>
}

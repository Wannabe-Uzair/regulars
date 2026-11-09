// Email: invites, password resets and owner summaries (M3). Plain text for now.
export type EmailMessage = { to: string; subject: string; text: string }

export type EmailPort = {
  /** Resolves once the provider has accepted the message; `id` is the provider's id for it. */
  send(message: EmailMessage): Promise<{ id: string }>
}

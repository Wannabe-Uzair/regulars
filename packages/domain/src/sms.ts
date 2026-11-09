// The links that open the coach's own messaging apps with the nudge filled in (SPEC §5, FR-NUDGE-03). Tenure never
// sends a message itself (FR-NUDGE-05): the coach's phone or computer does.

/** 'sms:<E.164>?&body=<encoded>': the ?& form works on iOS and Android. Null without a phone. */
export const smsUrl = (phone: string | null | undefined, body: string): string | null =>
  phone ? `sms:${phone}?&body=${encodeURIComponent(body)}` : null

/**
 * 'https://wa.me/<digits>?text=<encoded>': opens the coach's own WhatsApp with the message. wa.me takes the
 * international number with no '+', so the stored E.164 keeps only its digits (E.164 has no trunk 0). Null without a
 * phone.
 */
export const whatsappUrl = (phone: string | null | undefined, body: string): string | null =>
  phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(body)}` : null

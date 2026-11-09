// The default nudge templates (SPEC §5): every new gym starts with these; the demo seed uses them too.
// Sign-offs use a plain hyphen so each text stays in the GSM-7 alphabet and goes out as one SMS.
export const DEFAULT_TEMPLATES = [
  { name: 'We missed you', body: "Hey {first}, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? - Coach {coach}" },
  { name: 'First weeks', body: "Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything." },
  { name: 'One visit', body: "Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach}" },
]

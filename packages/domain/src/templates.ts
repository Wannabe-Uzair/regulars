// Nudge templates (SPEC §5): the defaults every new gym starts with, and filling their variables.

export type Template = {
  readonly name: string
  readonly body: string
}

/**
 * The default nudge templates; the demo seed uses them too. Sign-offs use a plain hyphen so each text stays in the
 * GSM-7 alphabet and goes out as one SMS.
 */
export const DEFAULT_TEMPLATES: readonly Template[] = [
  { name: 'We missed you', body: "Hey {first}, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? - Coach {coach}" },
  { name: 'First weeks', body: "Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything." },
  { name: 'One visit', body: "Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach}" },
]

/** The variables a template may use (FR-TPL-02), in the order the templates screen explains them. */
export const TEMPLATE_VARS = ['first', 'coach', 'gym', 'days'] as const
export type TemplateVar = (typeof TEMPLATE_VARS)[number]
export type TemplateVars = Partial<Record<TemplateVar, string | number | null>>

/** Fill {first} {coach} {gym} {days}; a missing value becomes ''. Unknown braces are left as they are. */
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{(first|coach|gym|days)\}/g, (_, k: TemplateVar) => String(vars[k] ?? ''))
}

/** The first word of a name, or '' for none: the old {coach} rule, so "Priya S." gives "Priya". */
export const firstWord = (name: string | null | undefined): string => (name ?? '').trim().split(/\s+/)[0] ?? ''

export type TemplateVarsInput = {
  /** The member's first name as stored: a single-named member's one name. */
  firstName: string
  /** The name of the person sending the nudge (not the member's coach). */
  senderName: string | null | undefined
  gymName: string
  daysSinceLastVisit: number | null
  daysSinceJoin: number
}

/**
 * The variables for one member and the sender (the old templateVars): {first} the member's first name, {coach} the
 * sender's first word, {gym} the gym's name, and {days} the days since the last visit, or since joining (never below
 * 0) for a member never seen.
 */
export function templateVarsFor(input: TemplateVarsInput): Record<TemplateVar, string | number> {
  return {
    first: input.firstName,
    coach: firstWord(input.senderName),
    gym: input.gymName,
    days: input.daysSinceLastVisit ?? Math.max(0, input.daysSinceJoin),
  }
}

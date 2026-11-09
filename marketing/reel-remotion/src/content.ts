/** The film's words that are not the voice-over: the figures' sources and the on-screen labels (checked by check-words.ts). */
export const figures = {
  sixInTen: { figure: '6 in 10', label: 'gone by month three', source: 'Sperandei et al., 2016' },
  renewed: {
    stay: '78%',
    stayLabel: '3+ visits a week',
    under: '59%',
    underLabel: 'Under once a week',
    source: '2001 UK industry study',
  },
} as const

export const member = { first: 'Sam', name: 'Sam Carter', initials: 'SC', coach: 'Mike' } as const

/** Coach Mike's text, after the app's own nudge template ("Hi {first}, it's {coach} from {gym}. ..."). */
export const nudgeText = "Hi Sam, it's Mike from Northside Strength. We missed you this week. See you Thursday?"

export const endCard = { name: 'Regulars', action: 'Try the Demo here.' } as const

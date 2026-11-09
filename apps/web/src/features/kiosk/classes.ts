/** Class names joined, the falsy ones left out. */
export const classes = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

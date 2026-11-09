import { createContext, use, type AriaAttributes } from 'react'

export type FieldContextValue = {
  /** The id the control takes, so the label's htmlFor points at it. */
  controlId: string
  /** The hint and error ids, space-separated, or undefined when there are neither. */
  describedBy: string | undefined
  invalid: boolean
}

export const FieldContext = createContext<FieldContextValue | null>(null)

type ControlAria = {
  id?: string | undefined
  'aria-describedby'?: string | undefined
  'aria-invalid'?: AriaAttributes['aria-invalid']
}

/**
 * Inside a Field, the control takes the Field's id, its hint and error in aria-describedby (ahead of any of its own)
 * and aria-invalid when there is an error. Outside one, the props pass through unchanged.
 */
export function useFieldControl<P extends ControlAria>(props: P): P {
  const field = use(FieldContext)
  if (!field) return props
  const describedBy = [field.describedBy, props['aria-describedby']].filter(Boolean).join(' ')
  return {
    ...props,
    id: field.controlId,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  }
}

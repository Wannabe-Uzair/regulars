import { ChoiceGroup } from '../ChoiceGroup/ChoiceGroup.tsx'
import { useTheme } from '../theme/context.ts'
import type { ThemeSetting } from '../theme/setting.ts'

export type ThemeChoiceProps = {
  /** The visible name of the group, e.g. "Theme". */
  label: string
  /** The option names, e.g. Light, Dark, Same as device. */
  optionLabels: Record<ThemeSetting, string>
  className?: string
}

const order: readonly ThemeSetting[] = ['light', 'dark', 'system']

/** The Me page setting: a segmented choice of Light, Dark and Same as device, saved on this device. */
export function ThemeChoice({ label, optionLabels, className }: ThemeChoiceProps) {
  const { choice, setChoice } = useTheme()
  return (
    <ChoiceGroup
      label={label}
      options={order.map((setting) => ({ value: setting, label: optionLabels[setting] }))}
      value={choice}
      onChange={setChoice}
      look="segmented"
      className={className}
    />
  )
}

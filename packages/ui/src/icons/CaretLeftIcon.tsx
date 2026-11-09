import { Icon, type IconProps } from './icon.tsx'

const path = 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z'

/** Phosphor's caret-left. */
export function CaretLeftIcon({ className }: IconProps) {
  return <Icon className={className} d={path} />
}

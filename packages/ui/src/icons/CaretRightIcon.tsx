import { Icon, type IconProps } from './icon.tsx'

const path =
  'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z'

/** Phosphor's caret-right. */
export function CaretRightIcon({ className }: IconProps) {
  return <Icon className={className} d={path} />
}

import { Icon, type IconProps } from './icon.tsx'

const path =
  'M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z'

/** Phosphor's caret-up. */
export function CaretUpIcon({ className }: IconProps) {
  return <Icon className={className} d={path} />
}

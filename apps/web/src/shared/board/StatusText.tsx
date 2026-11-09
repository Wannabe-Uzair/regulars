import type { Status } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { StatusTag } from '@tenure/ui'

/** The status tag with its name as text: status is never shown by colour alone. */
export function StatusText({ status }: { status: Status }) {
  return <StatusTag status={status}>{t(`status.${status}`)}</StatusTag>
}

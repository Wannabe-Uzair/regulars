// The member page's last row (UC-07): "Archive" for an active member (FR-MEMBER-05); "Restore Member" and, for owners,
// "Delete Permanently" for an archived one (FR-MEMBER-06, FR-MEMBER-07). The confirms name the member in full and echo
// their verb in one word ("Archive Sam Okafor?" with "Archive"); toasts keep "First L." (ARCHITECTURE §2, Members).
import type { MemberDetail } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, ConfirmDialog, FormError, useToast } from '@tenure/ui'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useArchiveMember, useDeleteMember } from '../api.ts'
import { fullName } from '../text.ts'
import styles from './ArchiveActions.module.css'

export type ArchiveActionsProps = {
  member: MemberDetail
  /** Owners delete an archived member for good; coaches only archive and restore their own. */
  canDelete: boolean
}

export function ArchiveActions({ member, canDelete }: ArchiveActionsProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const archive = useArchiveMember(member.id)
  const remove = useDeleteMember(member.id)
  const [asking, setAsking] = useState<'archive' | 'delete' | null>(null)
  // Archive and Restore take turns in one place: once the member is archived focus lands on Restore, and back.
  const turn = useRef<HTMLButtonElement>(null)
  const archived = member.archivedAt !== null
  const name = fullName(member)

  const ask = (which: 'archive' | 'delete') => {
    archive.reset()
    remove.reset()
    setAsking(which)
  }
  // Cancel, Escape or the corner: the confirm closes, and its last error with it.
  const close = (open: boolean) => {
    if (open) return
    setAsking(null)
    archive.reset()
    remove.reset()
  }

  const archiveThem = () =>
    archive.mutateAsync(true).then(() => {
      setAsking(null)
      toast.show({ message: t('member.archiveDone', { name: member.name }) })
    })

  const deleteThem = () =>
    remove.mutateAsync().then(() => {
      setAsking(null)
      toast.show({ message: t('member.deleteDone', { name: member.name }) })
      void navigate('/app/members', { replace: true })
    })

  const restore = () =>
    archive.mutate(false, {
      onSuccess: () => toast.show({ message: t('member.restoreDone', { name: member.name }) }),
    })

  return (
    <div className={styles.row}>
      <div className={styles.actions}>
        {archived ? (
          <>
            <Button ref={turn} loading={archive.isPending && asking === null} onClick={restore}>
              {t('member.restore')}
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={() => ask('delete')}>
                {t('member.delete')}
              </Button>
            )}
          </>
        ) : (
          <Button ref={turn} variant="quiet" onClick={() => ask('archive')}>
            {t('member.archive')}
          </Button>
        )}
      </div>
      {asking === null && <FormError message={archive.error?.message} submittedAt={archive.submittedAt} />}
      <ConfirmDialog
        title={t('member.archive.ask', { name })}
        body={t('member.archive.says', { first: member.firstName })}
        confirmLabel={t('member.archiveConfirm')}
        cancelLabel={t('common.cancel')}
        busy={archive.isPending}
        error={archive.error?.message}
        onConfirm={archiveThem}
        returnFocusTo={turn}
        open={asking === 'archive'}
        onOpenChange={close}
      />
      <ConfirmDialog
        title={t('member.delete.ask', { name })}
        body={t('member.deleteBody')}
        confirmLabel={t('member.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        busy={remove.isPending}
        error={remove.error?.message}
        onConfirm={deleteThem}
        returnFocusTo={turn}
        open={asking === 'delete'}
        onOpenChange={close}
      />
    </div>
  )
}

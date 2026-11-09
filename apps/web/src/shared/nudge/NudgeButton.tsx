// "Nudge": opens the composer, "Nudge {first}", with its stacked channels (FR-NUDGE-01 to 05, FR-TODAY-02,
// FR-BOARD-02, FR-MEMBER-04). Today, the board and the member page place it with these props, which stay as they are.
import { t } from '@tenure/copy'
import { Button, type ButtonSize, Dialog } from '@tenure/ui'
import { useRef, useState } from 'react'
import styles from './NudgeButton.module.css'
import { NudgeComposer } from './NudgeComposer.tsx'

/**
 * What the composer needs about the member: the id to record against, the first name for {first} and the titles, the
 * stored E.164 phone (null gives the no-phone variant, FR-NUDGE-04), and the days since the last visit for {days}.
 */
export type NudgeTarget = {
  id: number
  firstName: string
  phone: string | null
  daysSinceLastVisit: number | null
}

export type NudgeButtonProps = {
  member: NudgeTarget
  /** The button's words: "Nudge" (member.nudge) unless the screen has its own id with the same words. */
  label?: string
  /** `sm` in a member row; `md`, the default, on the member page's head row. */
  size?: ButtonSize
}

/**
 * The tinted Nudge capsule and its dialog, a sheet on phones, with Cancel at its leading edge. The composer mounts only
 * while the dialog is open, so it starts fresh each time and loads the templates only then. Once a nudge is recorded it
 * closes, focus comes back here, and the button settles to "Nudged" with its check (motion-1): kept while the row stays
 * mounted, and still opening the composer for another nudge. The live `nudge.recorded` event refreshes the screens.
 * As the dialog leaves, the page scrolls only as far as it takes to keep "Nudged" clear of the toast at the bottom
 * edge (audit B2-03): at once, under the leaving dialog, so nothing moves of its own.
 */
export function NudgeButton({ member, label = t('member.nudge'), size = 'md' }: NudgeButtonProps) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      title={t('nudge.title', { first: member.firstName })}
      cancelLabel={t('common.cancel')}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          ref={button}
          className={styles.trigger}
          variant={done ? 'quiet' : 'tinted'}
          size={size}
          done={done}
          data-member={member.id}
          aria-label={
            done
              ? t('a11y.nudgedMember', { name: member.firstName })
              : t('a11y.nudgeMember', { name: member.firstName })
          }
        >
          {done ? t('nudge.done') : label}
        </Button>
      }
    >
      <NudgeComposer
        key={member.id}
        member={member}
        onDone={() => {
          setDone(true)
          setOpen(false)
          button.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }}
      />
    </Dialog>
  )
}

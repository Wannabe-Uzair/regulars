// The stall's two demo controls, in stall mode only (FR-WEB-04, FR-OPS-03), each placed by Home (home-1). "Try the
// Demo" is the page's filled button: small in the bar, large in the hero and the close, the three named alike. "Reset
// the Demo" is a quiet small button in the footer (flow-1A); anyone at the stall may press it, and it asks first.
// Outside stall mode both render nothing.
import { t } from '@tenure/copy'
import { Button, type ButtonSize, ConfirmDialog, FormError, useToast } from '@tenure/ui'
import { useDemoStatus, useResetDemo, useTryDemo } from './api.ts'
import styles from './StallDemo.module.css'

export type TryDemoProps = {
  /** `sm` in the bar, `lg` in the hero and the closing section. */
  size: Extract<ButtonSize, 'sm' | 'lg'>
}

/** Signs the visitor in as the demo gym's owner and opens Today. A failure shows under this button only. */
export function TryDemo({ size }: TryDemoProps) {
  const status = useDemoStatus()
  const tryDemo = useTryDemo()
  if (!status.data?.stall) return null
  return (
    <div className={styles.try}>
      <Button variant="primary" size={size} loading={tryDemo.isPending} onClick={() => tryDemo.mutate()}>
        {t('demo.try')}
      </Button>
      <FormError message={tryDemo.error?.message} submittedAt={tryDemo.submittedAt} />
    </div>
  )
}

/** Re-seeds the demo gym behind its confirm, red only on the confirm itself, and says so in a toast. */
export function ResetDemo() {
  const status = useDemoStatus()
  const reset = useResetDemo()
  const toast = useToast()
  if (!status.data?.stall) return null

  async function resetTheDemo() {
    await reset.mutateAsync()
    toast.show({ message: t('demo.reset.done') })
  }

  return (
    <ConfirmDialog
      title={t('demo.reset.title')}
      body={t('demo.reset.body')}
      confirmLabel={t('demo.reset')}
      cancelLabel={t('common.cancel')}
      tone="danger"
      busy={reset.isPending}
      error={reset.error?.message}
      onConfirm={resetTheDemo}
      onOpenChange={(open) => open && reset.reset()}
      trigger={
        <Button variant="quiet" size="sm">
          {t('demo.reset')}
        </Button>
      }
    />
  )
}

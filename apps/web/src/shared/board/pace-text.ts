import { t } from '@tenure/copy'

/** Visits a week over the finished weeks, '1.5/wk', or the empty mark before the first week ends. */
export const paceText = (pace: number | null): string =>
  pace === null ? t('common.none') : t('board.pace', { x: pace.toFixed(1) })

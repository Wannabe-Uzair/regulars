// SPEC §4 statuses. Label type 12 px, rubber3 hairline box, no fill.
import { t } from '../copy.js'
// Getters so the words are looked up at render time through the copy deck.
export const STATUS_LABEL = {
  get slipping() { return t('status.slipping') }, get on() { return t('status.on') },
  get below() { return t('status.below') }, get new() { return t('status.new') },
}
export default function StatusTag({ status }) {
  return <span className={`tag tag-${status}`}>{STATUS_LABEL[status] ?? status}</span>
}

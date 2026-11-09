import { auth } from '../features/auth/index.ts'
import { billing } from '../features/billing/index.ts'
import { board } from '../features/board/index.ts'
import { importer } from '../features/import/index.ts'
import { invite } from '../features/invite/index.ts'
import { kiosk } from '../features/kiosk/index.ts'
import { me } from '../features/me/index.ts'
import { members } from '../features/members/index.ts'
import { nudges } from '../features/nudges/index.ts'
import { reports } from '../features/reports/index.ts'
import { settings } from '../features/settings/index.ts'
import { templates } from '../features/templates/index.ts'
import { today } from '../features/today/index.ts'
import { website } from '../features/website/index.ts'
import type { WebFeature } from './registry.ts'

/**
 * Every web feature, each registered once: a feature fills its own folder and never edits this list. Nav items show
 * in this order: Today, Board, Members, Nudges, Reports, Templates, Settings, Billing, Me (owner-only ones for owners).
 */
export const features: readonly WebFeature[] = [
  website,
  auth,
  today,
  board,
  members,
  nudges,
  reports,
  templates,
  settings,
  importer,
  billing,
  me,
  kiosk,
  invite,
]

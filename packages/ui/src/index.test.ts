import { expect, test } from 'vitest'
import * as ui from './index.ts'
import { uiPackage } from './index.ts'

test('exports its package name', () => {
  expect(uiPackage).toBe('@tenure/ui')
})

test('NFR-MAINT-01 exports the first version’s parts, from react and radix alone', () => {
  const parts = [
    'ChoiceGroup',
    'ConfirmDialog',
    'CopyField',
    'copyText',
    'DayTrack',
    'DaysGrid',
    'EmptyState',
    'FactList',
    'FileButton',
    'FormError',
    'Mark',
    'MarkLegend',
    'RollingNumber',
    'StatusDot',
    'StatusTag',
    'Table',
    'useMediaQuery',
    'WeekMarks',
    // The Phosphor icons (ARCHITECTURE §9 "Icons").
    'BackspaceIcon',
    'CalendarDotIcon',
    'CaretDownIcon',
    'CaretLeftIcon',
    'CaretRightIcon',
    'CaretUpIcon',
    'ChartBarIcon',
    'ChatCircleIcon',
    'CheckCircleIcon',
    'CheckIcon',
    'ClockCounterClockwiseIcon',
    'CopyIcon',
    'CreditCardIcon',
    'FunnelSimpleIcon',
    'GearSixIcon',
    'HandWavingIcon',
    'MagnifyingGlassIcon',
    'NoteIcon',
    'PhoneIcon',
    'PlusIcon',
    'QrCodeIcon',
    'SignOutIcon',
    'SquaresFourIcon',
    'UserCircleIcon',
    'UserPlusIcon',
    'UsersIcon',
    'XIcon',
  ] as const
  for (const name of parts) expect(typeof ui[name], name).toBe('function')
  expect(typeof ui.popClass).toBe('string')
})

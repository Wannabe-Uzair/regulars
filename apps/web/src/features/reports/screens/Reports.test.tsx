import type { QueryClient } from '@tanstack/react-query'
import type { ReportsResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { gymFormat } from '../../../shared/format/format.ts'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'
import { CHART_HEIGHT } from '../chart-layout.ts'
import barStyles from '../components/NudgeBar.module.css'

const visitsByWeek = Array.from({ length: 13 }, (_, i) => ({
  week: i + 1,
  stillComing: i < 12 ? 3 + i / 10 : null,
  slipped: i === 0 ? null : 1.5,
}))

const fixture: ReportsResponse = {
  cohorts: [
    { month: '2026-08', joined: 20, day30: 75, day60: 60, day90: 45 },
    { month: '2026-09', joined: 18, day30: 70, day60: 55, day90: null },
    { month: '2026-11', joined: 4, day30: null, day60: null, day90: null },
  ],
  visitsByWeek,
  line: 3,
  nudges: { sent: 12, cameBack: 5, waiting: 2, rate: 50 },
}

let client: QueryClient
let answer: () => Response | Promise<Response>

function renderReports(country = 'US') {
  const session = me('owner', { country })
  const fetch = mockFetch((_method, path) => {
    if (path === '/api/auth/me') return json(200, session)
    if (path === '/api/reports') return answer()
    return json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })
  })
  client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const { unmount } = render(
    <App client={client} router={createMemoryRouter(buildRoutes(features), { initialEntries: ['/app/reports'] })} />,
  )
  return {
    unmount,
    reportCalls: () => fetch.mock.calls.filter(([url]) => String(url) === '/api/reports').length,
  }
}

const cohortTable = async () =>
  within(await screen.findByRole('region', { name: t('reports.cohorts.title') })).getByRole('table')
const rows = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent))
const titles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
// The bar's name up to its first figure, so a query finds it whatever the counts.
const barPrefix = t('a11y.nudgeBar', { sent: '#', back: '#', none: '#', waiting: '#' }).split('#')[0]!
const isBar = (name: string) => name.startsWith(barPrefix)
const nudgeBar = () => screen.getByRole('img', { name: isBar })

beforeEach(() => {
  FakeEventSource.install()
  answer = () => json(200, fixture)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Reports', () => {
  test("FR-REPORT-01 the owner sees the nudges' result first, then the visits chart, then the cohorts, each titled by its takeaway", async () => {
    renderReports()
    expect(await screen.findByRole('heading', { level: 1, name: t('reports.title') })).toBeInTheDocument()
    const none = t('common.none')
    expect(rows(await cohortTable())).toEqual([
      ['Aug 2026', '20', '75%', '60%', '45%'],
      ['Sep 2026', '18', '70%', '55%', none],
      ['Nov 2026', '4', none, none, none],
    ])
    expect(screen.getByRole('img', { name: t('a11y.chart') })).toBeInTheDocument()

    // 12 sent, 2 still waiting: 5 of the 10 past their 7 days came back. Week 2 is the first slipped week under 2, and
    // August is the latest month with a day 90 share.
    expect(titles()).toEqual([
      t('reports.nudges.lead', { n: 5, total: 10 }),
      t('reports.visits.lead', { n: 2 }),
      t('reports.cohorts.lead', { n: 45, month: 'Aug 2026', day: 90 }),
    ])
    expect(titles()[0]).toMatch(/^5 of 10 nudges /)
    for (const id of ['reports.nudges.sent', 'reports.nudges.rate'] as const) {
      expect(screen.queryByText(t(id))).not.toBeInTheDocument()
    }
  })

  test("FR-REPORT-01 the nudges' title has its one, none and empty forms", async () => {
    const forms = [
      [{ sent: 3, cameBack: 1, waiting: 2, rate: 100 }, t('reports.nudges.leadOne', { n: 1 })],
      [{ sent: 3, cameBack: 0, waiting: 2, rate: 0 }, t('reports.nudges.leadOne', { n: 0 })],
      [{ sent: 2, cameBack: 0, waiting: 2, rate: null }, t('reports.nudges.leadNone')],
      [{ sent: 0, cameBack: 0, waiting: 0, rate: null }, t('reports.nudges.leadEmpty')],
    ] as const
    for (const [nudges, title] of forms) {
      answer = () => json(200, { ...fixture, nudges })
      const { unmount } = renderReports()
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
      expect(titles()[0]).toBe(title)
      // With none sent there is nothing to draw.
      expect(screen.queryAllByRole('img', { name: isBar })).toHaveLength(nudges.sent === 0 ? 0 : 1)
      unmount()
    }
  })

  test('FR-REPORT-01 the bar shows came back, no visit and still waiting as parts of all nudges sent, named for screen readers', async () => {
    renderReports()
    await cohortTable()
    const bar = nudgeBar()
    expect(bar).toHaveAccessibleName(t('a11y.nudgeBar', { sent: 12, back: 5, none: 5, waiting: 2 }))
    const parts = [...bar.querySelectorAll<HTMLElement>('[data-part]')]
    expect(parts.map((p) => [p.dataset['part'], p.style.flexGrow])).toEqual([
      ['back', '5'],
      ['none', '5'],
      ['waiting', '2'],
    ])
    // The legend names each part with its count; the bar's name already says it all to a screen reader.
    const legend = bar.nextElementSibling as HTMLElement
    expect(legend).toHaveAttribute('aria-hidden', 'true')
    expect([...legend.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      `${t('reports.nudges.cameBack')}5`,
      `${t('reports.nudges.noVisit')}5`,
      `${t('reports.nudges.waiting')}2`,
    ])
  })

  test("the nudges' sentence and the legend's counts roll; their text is the final value", async () => {
    renderReports()
    await cohortTable()
    const drawn = (el: Element) =>
      [...el.querySelectorAll<HTMLElement>('[aria-hidden="true"] [data-digit]')].map((d) => d.dataset['digit'])
    const lead = screen.getByRole('heading', { level: 2, name: t('reports.nudges.lead', { n: 5, total: 10 }) })
    expect(drawn(lead)).toEqual(['5', '1', '0'])
    expect(lead).toHaveTextContent(new RegExp(`^${t('reports.nudges.lead', { n: 5, total: 10 })}$`))
    const counts = [...(nudgeBar().nextElementSibling as HTMLElement).querySelectorAll('li')].map((li) => drawn(li))
    expect(counts).toEqual([['5'], ['5'], ['2']])
  })

  test('FR-REPORT-01 a part of 0 is left out of the bar', async () => {
    answer = () => json(200, { ...fixture, nudges: { sent: 4, cameBack: 4, waiting: 0, rate: 100 } })
    renderReports()
    await cohortTable()
    expect([...nudgeBar().querySelectorAll<HTMLElement>('[data-part]')].map((p) => p.dataset['part'])).toEqual(['back'])
  })

  test('FR-REPORT-02: each line is labelled once at its end, with no legend, and screen readers get every week', async () => {
    renderReports()
    const chart = await screen.findByRole('img', { name: t('a11y.chart') })
    for (const id of ['reports.chart.still', 'reports.chart.slipped', 'reports.chart.line'] as const) {
      expect(within(chart).getAllByText(t(id))).toHaveLength(1)
    }
    // Two paths and the line, with a marker on each slipped week (weeks 2 to 13), and no legend outside the chart.
    expect(chart.querySelectorAll('path')).toHaveLength(2)
    expect(chart.querySelectorAll('circle')).toHaveLength(12)
    expect(screen.getAllByText(t('reports.chart.still'))).toHaveLength(1)

    const description = chart.getAttribute('aria-describedby')!
    const desc = document.getElementById(description)!.textContent
    expect(desc).toContain(t('reports.chart.point', { n: 1, still: 3, slipped: t('reports.chart.none') }))
    expect(desc).toContain(t('reports.chart.point', { n: 13, still: t('reports.chart.none'), slipped: 1.5 }))
    expect(screen.getByText(t('reports.chart.stillDef'))).toBeInTheDocument()
  })

  test("FR-REPORT-03: months follow the gym's locale", async () => {
    renderReports('GB')
    const table = await cohortTable()
    const gb = gymFormat({ country: 'GB', timezone: 'Europe/London' }).month('2026-09')
    expect(gb).not.toBe(gymFormat({ country: 'US', timezone: 'America/Chicago' }).month('2026-09'))
    expect(rows(table)[1]![0]).toBe(gb)
  })

  test.each([
    'checkin.recorded',
    'member.joined',
    'member.updated',
    'member.deleted',
    'nudge.recorded',
    'import.committed',
  ])('FR-REPORT-01: %s refreshes the figures', async (type) => {
    const { reportCalls } = renderReports()
    await cohortTable()
    const before = reportCalls()
    answer = () => json(200, { ...fixture, nudges: { ...fixture.nudges, sent: 13 } })
    await act(async () => {
      FakeEventSource.instances
        .at(-1)!
        .emit({ type, gymId: 1, memberId: 1, coachId: null, name: 'Sam O.', at: '2026-11-06T13:30:00.000Z' })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await vi.waitFor(() => expect(titles()[0]).toBe(t('reports.nudges.lead', { n: 5, total: 11 })))
    expect(reportCalls()).toBe(before + 1)
  })

  test('FR-REPORT-01: when the figures fail to load, the error says why and Try again loads them', async () => {
    answer = () => json(500, { error: { code: 'server', message: 'Something went wrong on our side. Try again.' } })
    renderReports()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side. Try again.')
    answer = () => json(200, fixture)
    await userEvent.click(screen.getByRole('button', { name: t('common.retry') }))
    expect(rows(await cohortTable())).toHaveLength(3)
  })
})

/** The loading region's placeholder content, once the screen shows it: busy, one Loading status, inert and hidden. */
async function findSkeleton(): Promise<HTMLElement> {
  const region = await waitFor(() => {
    const busy = document.querySelector<HTMLElement>('[aria-busy="true"]:has(> [inert])')
    expect(busy).not.toBeNull()
    return busy as HTMLElement
  })
  expect(within(region).getByRole('status')).toHaveTextContent(t('common.loading'))
  const shapes = region.querySelector<HTMLElement>(':scope > [inert]') as HTMLElement
  expect(shapes).toHaveAttribute('aria-hidden', 'true')
  return shapes
}

describe('Reports, loading', () => {
  test("while Reports loads, the three panels hold their sentences and their figures' frames, then the figures", async () => {
    const pending = Promise.withResolvers<Response>()
    answer = () => pending.promise
    renderReports()
    const shapes = await findSkeleton()
    for (const sentence of ['reports.nudges.explain', 'reports.visits.explain', 'reports.cohorts.explain'] as const) {
      expect(within(shapes).getByText(t(sentence))).toBeInTheDocument()
    }
    expect(shapes.querySelectorAll('h2')).toHaveLength(3)
    // The bar's capsule and legend, the chart's box at the chart's height, the cohort table's head.
    expect(shapes.querySelector(`.${barStyles.nudgeBar} > .${barStyles.bar}`)).not.toBeNull()
    expect(shapes.querySelector('figure > div')).toHaveStyle({ blockSize: `${CHART_HEIGHT}px` })
    expect(within(shapes).getByText(t('reports.col.day90'))).toBeInTheDocument()

    await act(async () => pending.resolve(json(200, fixture)))
    expect(await cohortTable()).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})

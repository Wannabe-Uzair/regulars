import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { MemberStatus } from '../StatusTag/status.ts'
import { ChoiceGroup, type ChoiceLook, type ChoiceOption } from './ChoiceGroup.tsx'

type View = 'first' | 'everyone' | 'archived'

const views: ChoiceOption<View>[] = [
  { value: 'first', label: 'First 90 days' },
  { value: 'everyone', label: 'Everyone' },
  { value: 'archived', label: 'Archived' },
]

type Filter = 'all' | MemberStatus

const statuses: ChoiceOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'slipping', label: 'Slipping', dot: 'slipping' },
  { value: 'below', label: 'Below pace', dot: 'below' },
  { value: 'on', label: 'On pace', dot: 'on' },
  { value: 'new', label: 'New', dot: 'new' },
]

function Views({ onChange, look }: { onChange?: (v: View) => void; look?: ChoiceLook }) {
  const [value, setValue] = useState<View>('first')
  return (
    <ChoiceGroup
      label="Show"
      options={views}
      value={value}
      look={look}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

describe('ChoiceGroup', () => {
  test('FR-MEM-01 is a radio group named by its label, of native radios sharing one name, the value checked', () => {
    render(<Views />)
    const group = screen.getByRole('radiogroup', { name: 'Show' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['First 90 days', 'Everyone', 'Archived'])
    expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1)
    expect(within(group).getByRole('radio', { name: 'First 90 days' })).toBeChecked()
    expect(screen.getByText('Show')).toBeVisible()
  })

  test('FR-MEM-01 a click on an option chooses it and reports its value', async () => {
    const onChange = vi.fn()
    render(<Views onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Archived' }))
    expect(onChange).toHaveBeenCalledWith('archived')
    expect(screen.getByRole('radio', { name: 'Archived' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'First 90 days' })).not.toBeChecked()
  })

  test.each<ChoiceLook>(['segmented', 'chips'])(
    'NFR-USE-02 in the %s look, Tab reaches the chosen option and the arrow keys move the choice',
    async (look) => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <>
          <button type="button">Before</button>
          <Views look={look} onChange={onChange} />
        </>,
      )
      await user.click(screen.getByRole('button', { name: 'Before' }))
      await user.tab()
      expect(screen.getByRole('radio', { name: 'First 90 days' })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: 'Everyone' })).toHaveFocus()
      expect(screen.getByRole('radio', { name: 'Everyone' })).toBeChecked()
      expect(onChange).toHaveBeenLastCalledWith('everyone')

      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('radio', { name: 'First 90 days' })).toBeChecked()
      expect(onChange).toHaveBeenLastCalledWith('first')
    },
  )

  test('FR-MEM-02 the chips show each status with its dot, hidden from assistive technology, and All without one', () => {
    render(<ChoiceGroup label="Status" options={statuses} value="all" onChange={() => {}} look="chips" />)
    const group = screen.getByRole('radiogroup', { name: 'Status' })
    expect(group.querySelector('[data-look="chips"]')).not.toBeNull()
    for (const { label, dot } of statuses) {
      const option = within(group)
        .getByRole('radio', { name: String(label) })
        .closest('label')
      const mark = option?.querySelector('[data-status]')
      if (dot) {
        expect(mark).toHaveAttribute('data-status', dot)
        expect(mark).toHaveAttribute('aria-hidden', 'true')
      } else {
        expect(mark).toBeNull()
      }
      // The words alone name the option, so colour is never the only cue.
      expect(option?.textContent).toBe(label)
    }
  })

  test('FR-IMPORT-01 the segmented look is the default', () => {
    render(<Views />)
    expect(screen.getByRole('radiogroup').querySelector('[data-look="segmented"]')).not.toBeNull()
  })

  test('NFR-USE-03 FR-KIOSK-07 size="lg" and stretch reach the options, which keep their radio semantics', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ChoiceGroup label="Show" options={views} value="everyone" onChange={onChange} />)
    const options = () => screen.getByRole('radiogroup').querySelector('[data-look]')
    expect(options()).toHaveAttribute('data-size', 'md')
    expect(options()).not.toHaveAttribute('data-stretch')

    rerender(<ChoiceGroup label="Show" options={views} value="everyone" onChange={onChange} size="lg" stretch />)
    expect(options()).toHaveAttribute('data-size', 'lg')
    expect(options()).toHaveAttribute('data-stretch', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Archived' }))
    expect(onChange).toHaveBeenCalledWith('archived')
  })

  test('FR-MEM-01 a hidden label still names the group', () => {
    render(<ChoiceGroup label="Show" hideLabel options={views} value="everyone" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Show' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Everyone' })).toBeChecked()
  })
})

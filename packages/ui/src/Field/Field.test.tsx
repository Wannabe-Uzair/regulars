import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Input } from '../Input/Input.tsx'
import { Select } from '../Select/Select.tsx'
import { Textarea } from '../Textarea/Textarea.tsx'
import { Field } from './Field.tsx'

describe('Field', () => {
  test('labels its control through htmlFor and the control id', () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(screen.getByText('Email')).toHaveAttribute('for', input.id)
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  test('the hint describes the control', () => {
    render(
      <Field label="Email" hint="We send the weekly recap here.">
        <Input />
      </Field>,
    )
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('We send the weekly recap here.')
  })

  test('an error describes the control after the hint and marks it invalid', () => {
    render(
      <Field label="Email" hint="Work address." error="Enter an email address.">
        <Input aria-describedby="extra" />
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Work address. Enter an email address.')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(3)
    expect(input.getAttribute('aria-describedby')).toMatch(/ extra$/)
  })

  test('the error line is a polite live region that is there, empty, before any error arrives', () => {
    const { container, rerender } = render(
      <Field label="Email">
        <Input />
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Email' })
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toBeEmptyDOMElement()
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).not.toHaveAttribute('aria-invalid')

    // An async check comes back: the same element gets the text, so it is announced.
    rerender(
      <Field label="Email" error="That email is already a member.">
        <Input />
      </Field>,
    )
    expect(container.querySelector('[aria-live="polite"]')).toBe(live)
    expect(live).toHaveTextContent('That email is already a member.')
    expect(input).toHaveAccessibleDescription('That email is already a member.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  test('wires Select and Textarea the same way', () => {
    render(
      <>
        <Field label="Plan" error="Pick a plan.">
          <Select defaultValue="">
            <option value="">Choose</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Field>
        <Field label="Note" hint="Only coaches see this.">
          <Textarea />
        </Field>
      </>,
    )
    const select = screen.getByRole('combobox', { name: 'Plan' })
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Pick a plan.')
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription('Only coaches see this.')
  })

  test('each Field gets its own ids', () => {
    render(
      <>
        <Field label="First name">
          <Input />
        </Field>
        <Field label="Last name">
          <Input />
        </Field>
      </>,
    )
    const first = screen.getByRole('textbox', { name: 'First name' })
    const last = screen.getByRole('textbox', { name: 'Last name' })
    expect(first.id).not.toBe(last.id)
  })
})

describe('controls outside a Field', () => {
  test('work alone, keep their own props and show disabled and invalid states', () => {
    render(
      <>
        <Input aria-label="Search" id="search" />
        <Input aria-label="Code" disabled />
        <Textarea aria-label="Message" aria-invalid="true" />
        <Select aria-label="Coach" disabled>
          <option>Sam</option>
        </Select>
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveAttribute('id', 'search')
    expect(screen.getByRole('textbox', { name: 'Code' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInvalid()
    expect(screen.getByRole('combobox', { name: 'Coach' })).toBeDisabled()
  })

  test('Select puts className on the select, like Input and Textarea, and wrapperClassName on its wrapper', () => {
    render(
      <Select aria-label="Coach" className="control" wrapperClassName="wrapper">
        <option>Sam</option>
      </Select>,
    )
    const select = screen.getByRole('combobox', { name: 'Coach' })
    expect(select).toHaveClass('control')
    expect(select).not.toHaveClass('wrapper')
    expect(select.parentElement).toHaveClass('wrapper')
    expect(within(select.parentElement!).getByRole('combobox')).toBe(select)
  })

  test('pass a ref through to the native element', () => {
    let node: HTMLInputElement | null = null
    render(<Input aria-label="Search" ref={(el) => void (node = el)} />)
    expect(node).toBe(screen.getByRole('textbox', { name: 'Search' }))
  })
})

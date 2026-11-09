import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { buttonClass } from '../Button/button-class.ts'
import { FileButton } from './FileButton.tsx'

const csv = () => new File(['first,last\nSam,Ortiz\n'], 'members.csv', { type: 'text/csv' })

describe('FileButton', () => {
  test('FR-IMPORT-01 is a file input named by its words, inside a label in the button look', () => {
    render(<FileButton label="Choose CSV file" accept=".csv,text/csv" onFile={() => {}} />)
    const input = screen.getByLabelText('Choose CSV file')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', '.csv,text/csv')
    expect(input.closest('label')?.className).toContain(buttonClass())
  })

  test('FR-IMPORT-01 hands over the picked file, and clears the input so the same file can be picked again', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    render(<FileButton label="Choose CSV file" onFile={onFile} />)
    const input = screen.getByLabelText<HTMLInputElement>('Choose CSV file')
    const file = csv()
    await user.upload(input, file)
    expect(onFile).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
    await user.upload(input, file)
    expect(onFile).toHaveBeenCalledTimes(2)
  })

  test('FR-IMPORT-01 shows the picked file’s name beside the button', () => {
    const { rerender } = render(<FileButton label="Choose CSV file" onFile={() => {}} />)
    expect(screen.queryByText('members.csv')).toBeNull()
    rerender(<FileButton label="Choose CSV file" onFile={() => {}} fileName="members.csv" />)
    expect(screen.getByText('members.csv')).toBeVisible()
  })

  test('NFR-USE-02 Tab reaches the file input', async () => {
    render(<FileButton label="Choose CSV file" onFile={() => {}} />)
    await userEvent.tab()
    expect(screen.getByLabelText('Choose CSV file')).toHaveFocus()
  })
})

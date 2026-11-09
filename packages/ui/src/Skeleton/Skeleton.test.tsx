import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Skeleton, SkeletonGroup } from './Skeleton.tsx'
import css from './Skeleton.module.css'

/** The module's classes, which the type allows to be missing. */
const styles = { line: css.line ?? '', name: css.name ?? '', meta: css.meta ?? '', block: css.block ?? '' }

describe('Skeleton', () => {
  test('every shape is hidden from assistive technology', () => {
    const { container } = render(
      <>
        <Skeleton />
        <Skeleton shape="lines" count={3} />
        <Skeleton shape="block" />
        <Skeleton shape="row" />
      </>,
    )
    const shapes = [...container.children]
    expect(shapes).toHaveLength(4)
    for (const shape of shapes) expect(shape).toHaveAttribute('aria-hidden', 'true')
  })

  test('a line is one text line; lines draws its count; a row is a name over its meta lines', () => {
    const { container } = render(
      <>
        <Skeleton width="8em" />
        <Skeleton shape="lines" count={3} />
        <Skeleton shape="row" width="40%" />
        <Skeleton shape="row" count={2} />
      </>,
    )
    const [line, lines, row, wrapped] = [...container.children] as HTMLElement[]
    expect(line).toHaveClass(styles.line)
    expect(line?.style.getPropertyValue('--skeleton-width')).toBe('8em')
    expect(lines?.querySelectorAll(`.${styles.line}`)).toHaveLength(3)
    expect(row?.querySelector(`.${styles.name}`)).toBeInTheDocument()
    expect(row?.querySelector(`.${styles.meta}`)).toBeInTheDocument()
    expect(row?.style.getPropertyValue('--skeleton-width')).toBe('40%')
    expect(row?.querySelectorAll(`.${styles.meta}`)).toHaveLength(1)
    expect(wrapped?.querySelectorAll(`.${styles.meta}`)).toHaveLength(2)
  })

  test('a block takes its size from the caller', () => {
    const { container } = render(<Skeleton shape="block" className="chart" />)
    expect(container.firstElementChild).toHaveClass(styles.block, 'chart')
  })
})

describe('SkeletonGroup', () => {
  test('is busy, says its label once as a status, and makes its placeholder content inert', () => {
    render(
      <SkeletonGroup label="Loading…" className="layout">
        <Skeleton />
        <Skeleton shape="row" />
      </SkeletonGroup>,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading…')
    const group = status.parentElement
    expect(group).toHaveAttribute('aria-busy', 'true')
    const content = group?.querySelector('.layout')
    expect(content).toHaveAttribute('inert')
    expect(content).toHaveAttribute('aria-hidden', 'true')
    expect(content?.children).toHaveLength(2)
  })

  test('without a label it has no status of its own', () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
  })
})

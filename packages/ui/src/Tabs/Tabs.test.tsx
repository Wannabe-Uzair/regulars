import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { Tab, TabList, TabPanel, Tabs } from './Tabs.tsx'

function MemberViews() {
  return (
    <Tabs defaultValue="all">
      <TabList label="Member views">
        <Tab value="all">All</Tab>
        <Tab value="slipping">Slipping</Tab>
        <Tab value="new">New</Tab>
      </TabList>
      <TabPanel value="all">Everyone</TabPanel>
      <TabPanel value="slipping">Three slipping</TabPanel>
      <TabPanel value="new">Two new</TabPanel>
    </Tabs>
  )
}

describe('Tabs', () => {
  test('a named tab list with the default tab chosen and its panel shown', () => {
    render(<MemberViews />)
    expect(screen.getByRole('tablist', { name: 'Member views' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'All' })).toHaveTextContent('Everyone')
  })

  test('arrow keys move between tabs and switch the panel, wrapping at the ends', async () => {
    const user = userEvent.setup()
    render(<MemberViews />)
    await user.tab()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    const slipping = screen.getByRole('tab', { name: 'Slipping' })
    expect(slipping).toHaveFocus()
    expect(slipping).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Three slipping')

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'New' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Two new')
  })
})

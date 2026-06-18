import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DateRangeFilter } from './DateRangeFilter'

describe('DateRangeFilter', () => {
  it('renders with its label', () => {
    render(
      <MantineProvider>
        <DateRangeFilter value={[null, null]} onChange={vi.fn()} label="Limit to a date range" />
      </MantineProvider>,
    )
    expect(screen.getByText('Limit to a date range')).toBeInTheDocument()
  })
})

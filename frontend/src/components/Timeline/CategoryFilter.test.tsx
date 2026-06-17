import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CategoryFilter } from './CategoryFilter'

describe('CategoryFilter', () => {
  it('renders All/Audit/Content and reports selection', async () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <CategoryFilter value="all" onChange={onChange} />
      </MantineProvider>,
    )
    expect(screen.getByText('All')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Audit'))
    expect(onChange).toHaveBeenCalledWith('audit')
  })
})

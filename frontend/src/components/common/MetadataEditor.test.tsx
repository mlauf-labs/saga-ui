import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MetadataRow } from '../../lib/metadata'
import MetadataEditor from './MetadataEditor'

function renderEditor(rows: MetadataRow[]) {
  const onChange = vi.fn()
  render(
    <MantineProvider>
      <MetadataEditor rows={rows} onChange={onChange} />
    </MantineProvider>,
  )
  return onChange
}

describe('MetadataEditor', () => {
  it('shows the empty hint when there are no rows', () => {
    renderEditor([])
    expect(screen.getByText(/no metadata/i)).toBeInTheDocument()
  })

  it('renders existing key/value rows', () => {
    renderEditor([{ _id: 1, key: 'owner', value: 'finance' }])
    expect(screen.getByDisplayValue('owner')).toBeInTheDocument()
    expect(screen.getByDisplayValue('finance')).toBeInTheDocument()
  })

  it('adds an empty row when "Add field" is clicked', async () => {
    const onChange = renderEditor([])
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    expect(onChange).toHaveBeenCalledWith([{ _id: expect.any(Number), key: '', value: '' }])
  })

  it('removes a row via the remove button', async () => {
    const onChange = renderEditor([{ _id: 1, key: 'owner', value: 'finance' }])
    await userEvent.click(screen.getByRole('button', { name: /remove field/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

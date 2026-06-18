import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SagaEvent } from '../../types/api'
import { EventRow } from './EventRow'

function renderRow(event: SagaEvent, documents?: Record<string, string>) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <EventRow event={event} documents={documents} />
      </MemoryRouter>
    </MantineProvider>,
  )
}

const base: SagaEvent = {
  event_id: 'e1',
  category: 'audit',
  event_type: 'placement',
  document_id: 'd1',
  recorded_at: '2026-06-17T10:00:00Z',
  actor: 'agent',
  summary: 'Placed in Finanzen',
  details: {},
}

describe('EventRow', () => {
  it('shows the summary and a category badge', () => {
    renderRow(base)
    expect(screen.getByText('Placed in Finanzen')).toBeInTheDocument()
    expect(screen.getByText('audit')).toBeInTheDocument()
  })

  it('links to the document via ?doc when document_id is present', () => {
    renderRow(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/?doc=d1')
  })

  it('uses the document title from the documents map as the link text', () => {
    renderRow(base, { d1: 'Invoice March 2026.pdf' })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/?doc=d1')
    expect(link).toHaveTextContent('Invoice March 2026.pdf')
  })

  it('falls back to "document" when no title is available in the map', () => {
    renderRow(base)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/?doc=d1')
    expect(link).toHaveTextContent('document')
  })

  it('renders content events without a document link when none', () => {
    renderRow({ ...base, category: 'content', event_type: 'dated_fact', document_id: null })
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('falls back to a folder link when there is no document', () => {
    renderRow({
      ...base,
      event_type: 'folder_created',
      document_id: null,
      folder_id: 'f9',
    })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/folders/f9')
    expect(link).toHaveTextContent('folder')
  })

  it('prefers the document link when both document and folder are present', () => {
    renderRow({ ...base, folder_id: 'f9' })
    expect(screen.getByRole('link')).toHaveAttribute('href', '/?doc=d1')
  })

  it('shows the rationale from details.reason when present', () => {
    renderRow({ ...base, details: { reason: 'Similar to last month’s invoice.' } })
    expect(screen.getByText('Similar to last month’s invoice.')).toBeInTheDocument()
  })
})

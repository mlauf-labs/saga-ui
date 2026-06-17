import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SagaEvent } from '../../types/api'
import { EventRow } from './EventRow'

function renderRow(event: SagaEvent) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <EventRow event={event} />
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

  it('renders content events without a document link when none', () => {
    renderRow({ ...base, category: 'content', event_type: 'dated_fact', document_id: null })
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

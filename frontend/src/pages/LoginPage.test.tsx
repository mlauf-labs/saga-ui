import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { ApiClientError } from '../api/client'

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, user: null, loading: false }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return { ...original, useNavigate: () => mockNavigate }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MantineProvider>
      <Notifications />
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </MantineProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
  })

  it('renders username and password inputs with a sign-in button', () => {
    renderLogin()
    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument()
    // Mantine PasswordInput adds a toggle button also labelled "password"; target the input only
    expect(screen.getByLabelText('Password', { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls login() with the entered credentials and navigates on success', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    renderLogin()

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'admin')
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'secret')
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows an error message on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Unauthorized'))
    renderLogin()

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'admin')
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows rate-limit message when 429 is returned', async () => {
    const rateLimitError = new ApiClientError(429, 'Too Many Requests', 'rate limited')
    mockLogin.mockRejectedValueOnce(rateLimitError)
    renderLogin()

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'admin')
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument()
    })
  })
})

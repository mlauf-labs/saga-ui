/**
 * Lightweight browser-event bus for cross-cutting auth signals.
 *
 * The API client dispatches `auth:unauthorized` whenever the BFF returns
 * a 401.  The AuthProvider listens and clears the session so that the
 * ProtectedRoute redirects the user to /login automatically.
 */

export const AUTH_EVENT = 'auth:unauthorized' as const

export function dispatchUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT))
}

export function onUnauthorized(handler: () => void): () => void {
  window.addEventListener(AUTH_EVENT, handler)
  return () => window.removeEventListener(AUTH_EVENT, handler)
}

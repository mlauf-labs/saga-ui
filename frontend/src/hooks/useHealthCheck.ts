/**
 * Polls GET /health every 30 s to detect Saga reachability (UI-FR-33).
 * Returns the raw query result so callers can inspect `data.saga_reachable`.
 */
import { useQuery } from '@tanstack/react-query'
import { health } from '../api/client'

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: health.get,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
    // Health checks should not block the app on failure – treat silently
    throwOnError: false,
  })
}

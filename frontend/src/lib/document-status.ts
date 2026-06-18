import type { DocumentStatus } from '../types/api'

/** Pipeline-complete states — no further status changes are expected. */
export const TERMINAL_STATUSES: DocumentStatus[] = ['ready', 'failed']

/** True once a document has finished the ingestion pipeline (ready or failed). */
export function isTerminal(status: DocumentStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

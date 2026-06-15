import type { DocumentStatus } from '../types/api'

// ── Byte formatting ──────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// ── Date formatting ───────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

// ── MIME type labels ──────────────────────────────────────────────────────────

export function getMimeLabel(mimeType: string): string {
  const type = mimeType.toLowerCase()
  if (type === 'application/pdf') return 'PDF'
  if (type.startsWith('image/')) return 'Image'
  if (type.includes('word') || type.includes('docx')) return 'Word'
  if (type.includes('excel') || type.includes('xlsx') || type.includes('spreadsheet')) return 'Excel'
  if (type.includes('powerpoint') || type.includes('pptx') || type.includes('presentation'))
    return 'PowerPoint'
  if (type.startsWith('text/html')) return 'HTML'
  if (type.startsWith('text/')) return 'Text'
  if (type.includes('zip') || type.includes('archive')) return 'Archive'
  if (type.includes('json')) return 'JSON'
  if (type.includes('xml')) return 'XML'
  if (type.includes('csv')) return 'CSV'
  if (type.includes('email') || type.includes('eml') || type.includes('msg')) return 'E-Mail'
  return mimeType.split('/')[1]?.toUpperCase() ?? 'File'
}

// ── Document status ───────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<DocumentStatus, string> = {
  pending: 'gray',
  converting: 'blue',
  classifying_type: 'cyan',
  analyzing: 'indigo',
  summarizing: 'grape',
  classifying: 'pink',
  indexing: 'violet',
  ready: 'green',
  failed: 'red',
}

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending: 'Pending',
  converting: 'Converting',
  classifying_type: 'Classifying type',
  analyzing: 'Analyzing',
  summarizing: 'Summarizing',
  classifying: 'Placing',
  indexing: 'Indexing',
  ready: 'Ready',
  failed: 'Failed',
}

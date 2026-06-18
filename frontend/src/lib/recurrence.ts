/** Render an RRULE (as stored in a recurring event's `details.recurrence`) as human text. */

import { formatDate } from './format'

const UNIT: Record<string, string> = {
  DAILY: 'day',
  WEEKLY: 'week',
  MONTHLY: 'month',
  YEARLY: 'year',
}

const WEEKDAY: Record<string, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}

/** Parse an RRULE `UNTIL` token (`YYYYMMDD` or `YYYYMMDDTHHMMSSZ`) into an ISO date. */
function untilToIso(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function parseRule(rrule: string): Record<string, string> {
  const body = rrule.replace(/^RRULE:/i, '')
  const out: Record<string, string> = {}
  for (const part of body.split(';')) {
    const [key, val] = part.split('=')
    if (key && val) out[key.trim().toUpperCase()] = val.trim()
  }
  return out
}

/**
 * Human-readable cadence for a recurring event, e.g. "Every month",
 * "Every 2 weeks · until 01/06/2090", "Weekly on Mon, Wed". Falls back to "Repeats"
 * when the rule cannot be understood, so a row never shows a raw RRULE.
 */
export function describeRecurrence(rrule: string | undefined, endDate?: string): string {
  if (!rrule) return 'Repeats'
  const rule = parseRule(rrule)
  const unit = UNIT[rule.FREQ?.toUpperCase() ?? '']
  if (!unit) return 'Repeats'

  const interval = Number(rule.INTERVAL ?? '1')
  let text = interval > 1 ? `Every ${interval} ${unit}s` : `Every ${unit}`

  if (rule.BYDAY) {
    const days = rule.BYDAY.split(',')
      .map((d) => WEEKDAY[d.trim().toUpperCase()])
      .filter(Boolean)
    if (days.length > 0) text += ` on ${days.join(', ')}`
  }

  // End bound: prefer the rule's UNTIL/COUNT, else the event's separate end_date.
  const untilIso = rule.UNTIL ? untilToIso(rule.UNTIL) : null
  if (untilIso) {
    text += ` · until ${formatDate(untilIso)}`
  } else if (rule.COUNT) {
    text += ` · ${rule.COUNT} times`
  } else if (endDate) {
    text += ` · until ${formatDate(endDate)}`
  }

  return text
}

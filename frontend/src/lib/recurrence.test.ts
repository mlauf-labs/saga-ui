import { describe, expect, it } from 'vitest'
import { describeRecurrence } from './recurrence'

describe('describeRecurrence', () => {
  it('describes a simple monthly rule', () => {
    expect(describeRecurrence('FREQ=MONTHLY')).toBe('Every month')
  })

  it('describes an interval', () => {
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=2')).toBe('Every 2 weeks')
    expect(describeRecurrence('FREQ=YEARLY;INTERVAL=1')).toBe('Every year')
  })

  it('tolerates the RRULE: prefix and lowercase', () => {
    expect(describeRecurrence('RRULE:FREQ=DAILY')).toBe('Every day')
  })

  it('appends an UNTIL bound from the rule', () => {
    expect(describeRecurrence('FREQ=YEARLY;UNTIL=20900601T000000Z')).toBe(
      'Every year · until 01/06/2090',
    )
  })

  it('appends a COUNT bound', () => {
    expect(describeRecurrence('FREQ=DAILY;COUNT=10')).toBe('Every day · 10 times')
  })

  it('falls back to the separate end_date when the rule has no UNTIL', () => {
    expect(describeRecurrence('FREQ=MONTHLY', '2030-01-01')).toBe('Every month · until 01/01/2030')
  })

  it('lists weekdays for BYDAY', () => {
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Every week on Mon, Wed')
  })

  it('falls back to "Repeats" for an unparseable or missing rule', () => {
    expect(describeRecurrence(undefined)).toBe('Repeats')
    expect(describeRecurrence('GARBAGE')).toBe('Repeats')
  })
})

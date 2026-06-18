/** A [from, to] pair of `YYYY-MM-DD` date strings (either side may be null). */
export type DateRange = [string | null, string | null]

/**
 * Convert a picked range to the API's `from`/`to` query values: the start date is used
 * as-is (inclusive from midnight); the end date is extended to end-of-day so events on
 * the chosen "to" day are included.
 */
export function rangeToBounds(range: DateRange): { from?: string; to?: string } {
  return {
    from: range[0] ?? undefined,
    to: range[1] ? `${range[1]}T23:59:59` : undefined,
  }
}

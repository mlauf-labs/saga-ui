import { DatePickerInput } from '@mantine/dates'
import type { DateRange } from '../../lib/date-range'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (value: DateRange) => void
  label?: string
}

/** A From–To range picker (Mantine `@mantine/dates`) for scoping the timeline / agenda. */
export function DateRangeFilter({ value, onChange, label = 'Date range' }: DateRangeFilterProps) {
  return (
    <DatePickerInput
      type="range"
      label={label}
      placeholder="From – To"
      value={value}
      onChange={onChange}
      clearable
      size="xs"
      maw={300}
      popoverProps={{ withinPortal: true }}
    />
  )
}

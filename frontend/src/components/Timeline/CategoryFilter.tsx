import { SegmentedControl } from '@mantine/core'
import type { EventCategory } from '../../types/api'

export type CategorySelection = EventCategory | 'all'

interface CategoryFilterProps {
  value: CategorySelection
  onChange: (value: CategorySelection) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as CategorySelection)}
      data={[
        { label: 'All', value: 'all' },
        { label: 'Audit', value: 'audit' },
        { label: 'Content', value: 'content' },
      ]}
      size="sm"
    />
  )
}

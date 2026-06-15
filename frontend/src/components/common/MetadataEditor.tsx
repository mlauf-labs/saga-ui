/**
 * MetadataEditor – edits a free-form string/string map (folder metadata).
 */

import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import type { MetadataRow } from '../../lib/metadata'

interface MetadataEditorProps {
  rows: MetadataRow[]
  onChange: (rows: MetadataRow[]) => void
}

export default function MetadataEditor({ rows, onChange }: MetadataEditorProps) {
  const update = (id: number, field: 'key' | 'value', val: string) =>
    onChange(rows.map((r) => (r._id === id ? { ...r, [field]: val } : r)))

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Metadata
        </Text>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconPlus size={12} />}
          onClick={() => onChange([...rows, { _id: Date.now(), key: '', value: '' }])}
        >
          Add field
        </Button>
      </Group>

      {rows.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">
          No metadata. Click "Add field" to add a key/value pair.
        </Text>
      )}

      {rows.length > 0 && (
        <Table withTableBorder withColumnBorders fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: 120 }}>Key</Table.Th>
              <Table.Th style={{ minWidth: 160 }}>Value</Table.Th>
              <Table.Th w={36} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row._id}>
                <Table.Td>
                  <TextInput
                    size="xs"
                    variant="unstyled"
                    value={row.key}
                    onChange={(e) => update(row._id, 'key', e.currentTarget.value)}
                    placeholder="e.g. owner"
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    size="xs"
                    variant="unstyled"
                    value={row.value}
                    onChange={(e) => update(row._id, 'value', e.currentTarget.value)}
                    placeholder="value"
                  />
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Remove" openDelay={400}>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => onChange(rows.filter((r) => r._id !== row._id))}
                      aria-label="Remove field"
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}

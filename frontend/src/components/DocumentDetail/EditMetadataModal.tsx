/**
 * EditMetadataModal – edit title, summary, doc-type and extracted values
 * via PATCH /documents/{id}.
 */

import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { ApiClientError, docTypes, documents } from '../../api/client'
import type { DocumentResponse, ExtractedValue } from '../../types/api'

// ── Extracted value row editor ────────────────────────────────────────────────

const VALUE_TYPES = [
  'string',
  'number',
  'date',
  'currency',
  'percentage',
  'boolean',
  'identifier',
  'other',
]

interface ValueRow extends ExtractedValue {
  _id: number
}

function newRow(id: number): ValueRow {
  return { _id: id, key: '', type: 'string', value: '', normalized: null, confidence: 1 }
}

interface ExtractedValuesEditorProps {
  rows: ValueRow[]
  onChange: (rows: ValueRow[]) => void
}

function ExtractedValuesEditor({ rows, onChange }: ExtractedValuesEditorProps) {
  const update = (id: number, field: keyof ExtractedValue, val: string) =>
    onChange(rows.map((r) => (r._id === id ? { ...r, [field]: val || null } : r)))

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Extracted Values
        </Text>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={12} />}
          onClick={() => onChange([...rows, newRow(Date.now())])}
        >
          Add row
        </Button>
      </Group>

      {rows.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">
          No extracted values. Click "Add row" to add one.
        </Text>
      )}

      {rows.length > 0 && (
        <ScrollArea type="auto">
          <Table
            withTableBorder
            withColumnBorders
            fz="xs"
            styles={{ td: { padding: '4px 6px' }, th: { padding: '4px 6px' } }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 100 }}>Key</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>Type</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Value</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Normalized</Table.Th>
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
                      placeholder="e.g. invoice_number"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      variant="unstyled"
                      data={VALUE_TYPES}
                      value={row.type}
                      onChange={(v) => update(row._id, 'type', v ?? 'string')}
                      allowDeselect={false}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      variant="unstyled"
                      value={row.value}
                      onChange={(e) => update(row._id, 'value', e.currentTarget.value)}
                      placeholder="raw value"
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      variant="unstyled"
                      value={row.normalized ?? ''}
                      onChange={(e) => update(row._id, 'normalized', e.currentTarget.value)}
                      placeholder="normalised (optional)"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Remove row" openDelay={400}>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => onChange(rows.filter((r) => r._id !== row._id))}
                        aria-label="Remove row"
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface EditMetadataModalProps {
  opened: boolean
  onClose: () => void
  doc: DocumentResponse
}

export default function EditMetadataModal({ opened, onClose, doc }: EditMetadataModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [docTypeId, setDocTypeId] = useState<string | null>(null)
  const [valueRows, setValueRows] = useState<ValueRow[]>([])

  const { data: docTypeList } = useQuery({
    queryKey: ['docTypes'],
    queryFn: () => docTypes.list(),
    enabled: opened,
  })

  const docTypeOptions = useMemo(
    () => (docTypeList ?? []).map((dt) => ({ value: dt.doc_type_id, label: dt.name })),
    [docTypeList],
  )

  // Populate fields from doc whenever the modal transitions to open
  // (render-phase state sync; see https://react.dev/learn/you-might-not-need-an-effect).
  const [wasOpen, setWasOpen] = useState(false)
  if (opened && !wasOpen) {
    setWasOpen(true)
    setTitle(doc.title ?? '')
    setSummary(doc.summary ?? '')
    setDocTypeId(doc.doc_type_id ?? null)
    setValueRows((doc.extracted_values ?? []).map((v, i) => ({ ...v, _id: i })))
  } else if (!opened && wasOpen) {
    setWasOpen(false)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      notifications.show({
        title: 'Validation error',
        message: 'The title cannot be empty.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    // Validate: all value rows need at least key + value
    const invalidRow = valueRows.find((r) => !r.key.trim() || !r.value.trim())
    if (invalidRow) {
      notifications.show({
        title: 'Validation error',
        message: 'Each extracted value row needs a Key and a Value.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }

    setLoading(true)
    try {
      await documents.update(doc.document_id, {
        title: title.trim(),
        summary: summary.trim() || null,
        doc_type_id: docTypeId,
        extracted_values: valueRows.map(({ _id: _unused, ...v }) => v),
      })
      notifications.show({
        title: 'Document updated',
        message: 'The document metadata has been saved.',
        color: 'green',
        autoClose: 3000,
      })
      await queryClient.invalidateQueries({ queryKey: ['documents', doc.document_id] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['docTypes'] })
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Save failed'
      notifications.show({ title: 'Save failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit document"
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {/* Title */}
        <TextInput
          label="Title"
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />

        {/* Document type */}
        <Select
          label="Document type"
          description="Pick from the managed doc-type catalog (manage types under Doc Types)."
          placeholder="No document type"
          data={docTypeOptions}
          value={docTypeId}
          onChange={setDocTypeId}
          searchable
          clearable
          nothingFoundMessage="No matching doc-types"
        />

        {/* Summary */}
        <Textarea
          label="Summary"
          description="Short summary of the document."
          placeholder="Summary…"
          value={summary}
          onChange={(e) => setSummary(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={6}
        />

        <Divider />

        {/* Extracted values */}
        <ExtractedValuesEditor rows={valueRows} onChange={setValueRows} />

        <Divider />

        {/* Actions */}
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

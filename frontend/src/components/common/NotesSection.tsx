/**
 * NotesSection – reusable notes editor for documents and folders.
 *
 * Presentational + local edit state only. The parent supplies the current
 * notes and async add/update/remove handlers (and is responsible for query
 * invalidation after a successful mutation).
 */

import { useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { IconCheck, IconEdit, IconNote, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note } from '../../types/api'
import { formatDateTime } from '../../lib/format'

interface NotesSectionProps {
  notes: Note[]
  onAdd: (content: string) => Promise<void>
  onUpdate: (noteId: string, content: string) => Promise<void>
  onRemove: (noteId: string) => Promise<void>
  title?: string
}

export default function NotesSection({
  notes,
  onAdd,
  onUpdate,
  onRemove,
  title = 'Notes',
}: NotesSectionProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const handleAdd = async () => {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await onAdd(draft.trim())
      setDraft('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  const handleUpdate = async (noteId: string) => {
    if (!editDraft.trim()) return
    setBusy(true)
    try {
      await onUpdate(noteId, editDraft.trim())
      setEditingId(null)
      setEditDraft('')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (noteId: string) => {
    setBusy(true)
    try {
      await onRemove(noteId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap={4}>
          <IconNote size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {title}
          </Text>
        </Group>
        {!adding && (
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconPlus size={12} />}
            onClick={() => setAdding(true)}
          >
            Add note
          </Button>
        )}
      </Group>

      {adding && (
        <Stack gap={4}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="Write a note…"
            autosize
            minRows={2}
            size="xs"
            autoFocus
          />
          <Group justify="flex-end" gap={4}>
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                setAdding(false)
                setDraft('')
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="compact-xs" onClick={handleAdd} loading={busy} disabled={!draft.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      )}

      {notes.length === 0 && !adding && (
        <Text size="xs" c="dimmed" fs="italic">
          No notes yet.
        </Text>
      )}

      <Stack gap={6}>
        {notes.map((note) => (
          <Box
            key={note.note_id}
            p="xs"
            style={{
              borderRadius: 6,
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            {editingId === note.note_id ? (
              <Stack gap={4}>
                <Textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  size="xs"
                  autoFocus
                />
                <Group justify="flex-end" gap={4}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                    aria-label="Cancel edit"
                  >
                    <IconX size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="green"
                    onClick={() => handleUpdate(note.note_id)}
                    loading={busy}
                    aria-label="Save note"
                  >
                    <IconCheck size={14} />
                  </ActionIcon>
                </Group>
              </Stack>
            ) : (
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
                  <Box fz="xs" className="markdown-preview markdown-preview--compact">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </Box>
                  <Text size="10px" c="dimmed">
                    {formatDateTime(note.updated_at)}
                  </Text>
                </Stack>
                <Group gap={2} style={{ flexShrink: 0 }}>
                  <Tooltip label="Edit" openDelay={400}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => {
                        setEditingId(note.note_id)
                        setEditDraft(note.content)
                      }}
                      aria-label="Edit note"
                    >
                      <IconEdit size={13} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete" openDelay={400}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemove(note.note_id)}
                      aria-label="Delete note"
                    >
                      <IconTrash size={13} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            )}
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}

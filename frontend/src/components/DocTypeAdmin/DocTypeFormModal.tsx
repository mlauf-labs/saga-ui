import { useState } from 'react'
import { Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { ApiClientError, docTypes } from '../../api/client'
import EmojiField from '../common/EmojiField'
import type { DocType } from '../../types/api'

interface DocTypeFormModalProps {
  opened: boolean
  onClose: () => void
  /** When provided, the modal edits this doc-type; otherwise it creates a new one. */
  docType?: DocType | null
}

export default function DocTypeFormModal({ opened, onClose, docType }: DocTypeFormModalProps) {
  const queryClient = useQueryClient()
  const isEdit = !!docType
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [saving, setSaving] = useState(false)

  // Populate fields when the modal transitions to open (render-phase state sync).
  const [wasOpen, setWasOpen] = useState(false)
  if (opened && !wasOpen) {
    setWasOpen(true)
    setName(docType?.name ?? '')
    setDescription(docType?.description ?? '')
    setEmoji(docType?.emoji ?? '')
  } else if (!opened && wasOpen) {
    setWasOpen(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Validation error',
        message: 'A doc-type name is required.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    setSaving(true)
    try {
      if (isEdit && docType) {
        await docTypes.update(docType.doc_type_id, {
          name: name.trim(),
          description: description.trim() || null,
          // Empty string clears the emoji on the server; null would leave it unchanged.
          emoji: emoji.trim(),
        })
      } else {
        await docTypes.create({
          name: name.trim(),
          description: description.trim() || null,
          emoji: emoji.trim() || null,
        })
      }
      notifications.show({
        title: isEdit ? 'Doc-type updated' : 'Doc-type created',
        message: `"${name.trim()}" has been saved.`,
        color: 'green',
        autoClose: 3000,
      })
      await queryClient.invalidateQueries({ queryKey: ['docTypes'] })
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Save failed'
      notifications.show({ title: 'Save failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit doc-type' : 'New doc-type'} size="md">
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="e.g. invoice"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          autoFocus
        />
        <Textarea
          label="Description"
          description="When should this type be used? (helps the LLM classify documents)."
          placeholder="Describe this document type…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={6}
        />
        <EmojiField
          value={emoji}
          onChange={setEmoji}
          description="Shown next to the doc-type name everywhere in the UI."
          suggest={{ kind: 'doc_type', name, description }}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

/**
 * UploadModal – multi-file upload with per-file status tracking (Step 8).
 *
 * Accepts one or more files via Mantine Dropzone or a file picker.
 * Each file is uploaded sequentially; status is tracked per entry.
 * On completion the document list and folder tree are invalidated
 * so fresh data is fetched automatically.
 */

import { useCallback, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import {
  IconCheck,
  IconClock,
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { documents } from '../../api/client'
import { formatBytes } from '../../lib/format'
import { ApiClientError } from '../../api/client'

// 100 MB client-side hint (BFF enforces the real limit server-side)
const MAX_BYTES = 100 * 1024 * 1024

type FileStatus = 'queued' | 'uploading' | 'done' | 'error'

interface FileEntry {
  file: File
  status: FileStatus
  error?: string
}

// ── File icon ─────────────────────────────────────────────────────────────────

function FileIcon({ mime }: { mime: string }) {
  if (mime === 'application/pdf') return <IconFileTypePdf size={16} />
  if (mime.startsWith('image/')) return <IconPhoto size={16} />
  return <IconFile size={16} />
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case 'queued':
      return <IconClock size={14} color="var(--mantine-color-dimmed)" />
    case 'uploading':
      return <Loader size={14} />
    case 'done':
      return (
        <ThemeIcon size={18} radius="xl" color="green" variant="light">
          <IconCheck size={11} />
        </ThemeIcon>
      )
    case 'error':
      return (
        <ThemeIcon size={18} radius="xl" color="red" variant="light">
          <IconX size={11} />
        </ThemeIcon>
      )
  }
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface UploadModalProps {
  opened: boolean
  onClose: () => void
}

export default function UploadModal({ opened, onClose }: UploadModalProps) {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((files: File[]) => {
    // Validate size client-side; reject oversized files immediately
    const valid: FileEntry[] = []
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        notifications.show({
          title: 'File too large',
          message: `${f.name} exceeds the 100 MB limit and was not added.`,
          color: 'orange',
          autoClose: 5000,
        })
      } else {
        // Avoid duplicates
        valid.push({ file: f, status: 'queued' })
      }
    }
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name))
      return [...prev, ...valid.filter((v) => !existing.has(v.file.name))]
    })
  }, [])

  const removeEntry = (name: string) =>
    setEntries((prev) => prev.filter((e) => e.file.name !== name))

  const updateStatus = (name: string, patch: Partial<FileEntry>) =>
    setEntries((prev) =>
      prev.map((e) => (e.file.name === name ? { ...e, ...patch } : e)),
    )

  const startUpload = async () => {
    const queued = entries.filter((e) => e.status === 'queued')
    if (!queued.length) return

    setUploading(true)

    for (const entry of queued) {
      updateStatus(entry.file.name, { status: 'uploading' })
      try {
        await documents.upload(entry.file)
        updateStatus(entry.file.name, { status: 'done' })
      } catch (err) {
        let message = 'Upload failed'
        if (err instanceof ApiClientError) {
          if (err.status === 409) message = 'A document with this name already exists.'
          else if (err.status === 413) message = 'File exceeds server size limit.'
          else message = err.message
        }
        updateStatus(entry.file.name, { status: 'error', error: message })
        notifications.show({
          title: `Failed: ${entry.file.name}`,
          message,
          color: 'red',
          autoClose: 6000,
        })
      }
    }

    // Refresh document list and folder tree
    await queryClient.invalidateQueries({ queryKey: ['documents'] })
    await queryClient.invalidateQueries({ queryKey: ['folders'] })

    notifications.show({
      title: 'Upload complete',
      message: `${queued.length} file(s) submitted for processing.`,
      color: 'green',
      autoClose: 4000,
    })

    setUploading(false)
  }

  const handleClose = () => {
    if (uploading) return
    setEntries([])
    onClose()
  }

  const queuedCount = entries.filter((e) => e.status === 'queued').length

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Upload Documents"
      size="md"
      closeOnClickOutside={!uploading}
      closeOnEscape={!uploading}
    >
      <Stack gap="md">
        {/* Dropzone */}
        <Dropzone
          onDrop={addFiles}
          onReject={(files) => {
            notifications.show({
              title: 'Some files were rejected',
              message: files.map((f) => f.file.name).join(', '),
              color: 'orange',
              autoClose: 5000,
            })
          }}
          maxSize={MAX_BYTES}
          disabled={uploading}
          aria-label="Drop files here to upload"
        >
          <Group justify="center" gap="xs" mih={80} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={28} color="var(--mantine-color-blue-6)" />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={28} color="var(--mantine-color-red-6)" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload size={28} color="var(--mantine-color-dimmed)" />
            </Dropzone.Idle>
            <Stack gap={2} align="center">
              <Text size="sm" fw={500}>
                Drag files here or click to browse
              </Text>
              <Text size="xs" c="dimmed">
                Any file type · max 100 MB per file
              </Text>
            </Stack>
          </Group>
        </Dropzone>

        {/* File list */}
        {entries.length > 0 && (
          <Stack gap={4}>
            {entries.map((entry) => (
              <Group
                key={entry.file.name}
                px="sm"
                py={6}
                gap="sm"
                wrap="nowrap"
                style={{
                  borderRadius: 6,
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                {/* MIME icon */}
                <Box c="dimmed" style={{ flexShrink: 0 }}>
                  <FileIcon mime={entry.file.type} />
                </Box>

                {/* Name + size */}
                <Stack gap={0} flex={1} style={{ minWidth: 0 }}>
                  <Tooltip label={entry.file.name} openDelay={600} disabled={entry.file.name.length < 40}>
                    <Text size="xs" truncate>
                      {entry.file.name}
                    </Text>
                  </Tooltip>
                  {entry.error ? (
                    <Text size="xs" c="red">
                      {entry.error}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {formatBytes(entry.file.size)}
                    </Text>
                  )}
                </Stack>

                {/* Status */}
                <Box style={{ flexShrink: 0 }}>
                  <StatusIcon status={entry.status} />
                </Box>

                {/* Remove (only when queued) */}
                {entry.status === 'queued' && !uploading && (
                  <Box
                    component="button"
                    onClick={() => removeEntry(entry.file.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--mantine-color-dimmed)',
                      flexShrink: 0,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={`Remove ${entry.file.name}`}
                  >
                    <IconX size={14} />
                  </Box>
                )}
              </Group>
            ))}
          </Stack>
        )}

        {/* Actions */}
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} disabled={uploading}>
            {entries.every((e) => e.status !== 'queued') ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={startUpload}
            loading={uploading}
            disabled={queuedCount === 0}
            leftSection={<IconUpload size={14} />}
          >
            Upload
            {queuedCount > 0 && (
              <Badge size="xs" ml={6} variant="white" color="blue">
                {queuedCount}
              </Badge>
            )}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

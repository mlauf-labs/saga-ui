/**
 * DocumentPreview – inline content preview (Step 6).
 *
 * Rendering strategy by MIME type:
 *   application/pdf  → react-pdf (PDF.js)
 *   image/*          → <img> via BFF file URL
 *   everything else  → content_markdown via react-markdown, or download fallback
 *
 * The markdown content is fetched lazily only when needed (include_content=true),
 * keeping the metadata panel load fast.
 *
 * Exports:
 *   default                      – inline preview component
 *   DocumentMarkdownExpandButton – expand button + full-screen modal (place in header)
 */

import { useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { useDisclosure, useElementSize } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFile,
} from '@tabler/icons-react'
import { documents } from '../../api/client'
import type { DocumentResponse } from '../../types/api'

// Configure PDF.js worker (Vite resolves import.meta.url at build time)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// ── Shared markdown renderer ───────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <Box
      style={{ fontSize: 13, lineHeight: 1.65, overflow: 'hidden' }}
      className="markdown-preview"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}

// ── Content query hook (shared between inline preview and modal) ───────────────

function useDocumentContent(documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId, 'content'],
    queryFn: () => documents.get(documentId, /* includeContent */ true),
    staleTime: 5 * 60 * 1000,
  })
}

// ── PDF preview ───────────────────────────────────────────────────────────────

function PdfPreview({ documentId }: { documentId: string }) {
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { ref: containerRef, width: containerWidth } = useElementSize<HTMLDivElement>()

  if (loadError) {
    return (
      <Alert icon={<IconAlertTriangle size={14} />} color="red" variant="light" m="sm">
        Failed to load PDF.{' '}
        <Anchor href={documents.fileUrl(documentId)} download size="xs">
          Download instead
        </Anchor>
      </Alert>
    )
  }

  return (
    <Stack gap="xs">
      {numPages > 1 && (
        <Group justify="center" gap="xs" pt="xs">
          <Tooltip label="Previous page">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <IconChevronLeft size={14} />
            </ActionIcon>
          </Tooltip>
          <Text size="xs" c="dimmed">
            {page} / {numPages}
          </Text>
          <Tooltip label="Next page">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              disabled={page >= numPages}
              aria-label="Next page"
            >
              <IconChevronRight size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}

      <Box
        ref={containerRef}
        style={{
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Document
          file={documents.fileUrl(documentId, 'inline')}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n)
            setPage(1)
          }}
          onLoadError={(err) => setLoadError(err.message)}
          loading={
            <Center p="xl">
              <Loader size="sm" />
            </Center>
          }
          error={null}
        >
          <Page
            pageNumber={page}
            width={containerWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={
              <Center p="xl">
                <Loader size="sm" />
              </Center>
            }
          />
        </Document>
      </Box>
    </Stack>
  )
}

// ── Image preview ─────────────────────────────────────────────────────────────

function ImagePreview({ documentId, title }: { documentId: string; title: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <Alert icon={<IconAlertTriangle size={14} />} color="orange" variant="light" m="sm">
        Failed to load image.{' '}
        <Anchor href={documents.fileUrl(documentId)} download size="xs">
          Download instead
        </Anchor>
      </Alert>
    )
  }

  return (
    <Box
      style={{
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <img
        src={documents.fileUrl(documentId, 'inline')}
        alt={title}
        onError={() => setError(true)}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </Box>
  )
}

// ── Markdown inline preview ───────────────────────────────────────────────────

function MarkdownPreview({ documentId }: { documentId: string }) {
  const { data, isLoading, isError } = useDocumentContent(documentId)

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={14} w={i % 3 === 2 ? '60%' : '100%'} radius="sm" />
        ))}
      </Stack>
    )
  }

  if (isError || !data?.content_markdown) {
    return <FallbackPreview documentId={documentId} />
  }

  return <MarkdownContent content={data.content_markdown} />
}

// ── Expand button + full-screen modal (exported for use in panel header) ───────

/**
 * Renders an expand icon button that opens the full markdown text in a modal.
 * Renders nothing for PDFs, images, or documents that are not yet ready.
 * Uses the same react-query cache key as the inline preview → no extra fetch.
 */
export function DocumentMarkdownExpandButton({ doc }: { doc: DocumentResponse }) {
  const [opened, { open, close }] = useDisclosure(false)

  if (doc.status !== 'ready') {
    return null
  }

  return (
    <>
      <Tooltip label="Vollständigen Text anzeigen" openDelay={400}>
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={open}
          aria-label="Vollbild-Ansicht öffnen"
        >
          <IconArrowsMaximize size={14} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={close}
        title={doc.title}
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{
          title: { fontWeight: 600 },
          body: { padding: '1rem 1.5rem 1.5rem' },
        }}
      >
        <ModalMarkdownContent documentId={doc.document_id} />
      </Modal>
    </>
  )
}

function ModalMarkdownContent({ documentId }: { documentId: string }) {
  const { data, isLoading, isError } = useDocumentContent(documentId)

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} height={14} w={i % 4 === 3 ? '55%' : '100%'} radius="sm" />
        ))}
      </Stack>
    )
  }

  if (isError || !data?.content_markdown) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm" c="dimmed">
          <IconFile size={32} />
          <Text size="sm">Kein Textinhalt verfügbar.</Text>
        </Stack>
      </Center>
    )
  }

  return <MarkdownContent content={data.content_markdown} />
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function FallbackPreview({ documentId }: { documentId: string }) {
  return (
    <Center py="lg">
      <Stack align="center" gap="sm" c="dimmed">
        <IconFile size={32} />
        <Text size="sm" ta="center">
          No inline preview available for this file type.
        </Text>
        <Anchor href={documents.fileUrl(documentId)} download size="sm">
          <Group gap={4}>
            <IconDownload size={14} />
            Download file
          </Group>
        </Anchor>
      </Stack>
    </Center>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

interface DocumentPreviewProps {
  doc: DocumentResponse
}

export default function DocumentPreview({ doc }: DocumentPreviewProps) {
  const mime = doc.mime_type.toLowerCase()

  if (doc.status !== 'ready') {
    return (
      <Center py="lg">
        <Stack align="center" gap="xs" c="dimmed">
          <Loader size="sm" />
          <Text size="xs">Preview available once processing is complete.</Text>
        </Stack>
      </Center>
    )
  }

  if (mime === 'application/pdf') {
    return <PdfPreview documentId={doc.document_id} />
  }

  if (mime.startsWith('image/')) {
    return <ImagePreview documentId={doc.document_id} title={doc.title} />
  }

  return (
    <ScrollArea mah={500}>
      <MarkdownPreview documentId={doc.document_id} />
    </ScrollArea>
  )
}

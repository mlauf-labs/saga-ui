import { Drawer } from '@mantine/core'
import DocumentDetailPanel from '../DocumentDetail/DocumentDetailPanel'

interface MobileDetailSheetProps {
  opened: boolean
  onClose: () => void
  documentId: string | null
  onDocumentDeleted: () => void
}

export default function MobileDetailSheet({
  opened,
  onClose,
  documentId,
  onDocumentDeleted,
}: MobileDetailSheetProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="92dvh"
      title={null}
      withCloseButton
      styles={{
        content: {
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          flexDirection: 'column',
        },
        header: {
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          background: 'transparent',
          padding: 0,
          minHeight: 'unset',
        },
        body: {
          padding: 0,
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DocumentDetailPanel
        documentId={documentId}
        onDocumentDeleted={() => {
          onDocumentDeleted()
          onClose()
        }}
      />
    </Drawer>
  )
}

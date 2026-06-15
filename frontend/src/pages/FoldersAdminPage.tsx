import { useState } from 'react'
import { Button, Center, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconFolderPlus, IconFolders } from '@tabler/icons-react'
import AdminLayout from '../components/Layout/AdminLayout'
import FolderTreePanel from '../components/FolderTree/FolderTreePanel'
import FolderEditor from '../components/FolderAdmin/FolderEditor'
import CreateFolderModal from '../components/FolderAdmin/CreateFolderModal'

export default function FoldersAdminPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)

  const openCreateRoot = () => {
    setCreateParentId(null)
    openCreate()
  }

  const openCreateChild = (parentId: string) => {
    setCreateParentId(parentId)
    openCreate()
  }

  return (
    <AdminLayout
      navbarLabel="Toggle folder tree"
      navbar={
        <FolderTreePanel
          activeFolderId={selectedFolderId}
          onFolderSelect={(id) => setSelectedFolderId(id)}
          showAllOption={false}
          title="Folders"
          toolbar={
            <Button
              fullWidth
              size="xs"
              variant="light"
              leftSection={<IconFolderPlus size={14} />}
              onClick={openCreateRoot}
            >
              New root folder
            </Button>
          }
        />
      }
    >
      <CreateFolderModal
        opened={createOpened}
        onClose={closeCreate}
        defaultParentId={createParentId}
        onCreated={(id) => setSelectedFolderId(id)}
      />

      {selectedFolderId ? (
        <FolderEditor
          key={selectedFolderId}
          folderId={selectedFolderId}
          onDeleted={() => setSelectedFolderId(null)}
          onCreateChild={openCreateChild}
        />
      ) : (
        <Center h="60vh">
          <Stack align="center" gap="sm" c="dimmed">
            <IconFolders size={40} />
            <Text size="sm">Select a folder to edit, or create a new one.</Text>
            <Button
              variant="light"
              leftSection={<IconFolderPlus size={16} />}
              onClick={openCreateRoot}
            >
              New root folder
            </Button>
          </Stack>
        </Center>
      )}
    </AdminLayout>
  )
}

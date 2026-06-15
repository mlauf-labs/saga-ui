import { Box, Group, Text, UnstyledButton } from '@mantine/core'
import { IconFiles, IconFolders, IconSearch, IconUpload } from '@tabler/icons-react'

export type MobileTab = 'documents' | 'search'

interface NavButtonProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 4px',
        color: active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dimmed)',
        borderTop: active
          ? '2px solid var(--mantine-color-blue-6)'
          : '2px solid transparent',
        transition: 'color 150ms',
      }}
      aria-label={label}
      aria-selected={active}
    >
      {icon}
      <Text size="xs" mt={2} fw={active ? 600 : 400} style={{ lineHeight: 1 }}>
        {label}
      </Text>
    </UnstyledButton>
  )
}

interface BottomNavProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  onFolderClick: () => void
  onUploadClick: () => void
}

export default function BottomNav({
  activeTab,
  onTabChange,
  onFolderClick,
  onUploadClick,
}: BottomNavProps) {
  return (
    <Box
      h="100%"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Group h="100%" gap={0} wrap="nowrap">
        <NavButton
          icon={<IconFiles size={22} />}
          label="Documents"
          active={activeTab === 'documents'}
          onClick={() => onTabChange('documents')}
        />
        <NavButton
          icon={<IconSearch size={22} />}
          label="Search"
          active={activeTab === 'search'}
          onClick={() => onTabChange('search')}
        />
        <NavButton
          icon={<IconFolders size={22} />}
          label="Folders"
          onClick={onFolderClick}
        />
        <NavButton
          icon={<IconUpload size={22} />}
          label="Upload"
          onClick={onUploadClick}
        />
      </Group>
    </Box>
  )
}

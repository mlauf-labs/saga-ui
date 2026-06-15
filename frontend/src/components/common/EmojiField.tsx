/**
 * EmojiField – pick, paste, or LLM-suggest a single emoji.
 *
 * A read-only input opens a popover with a curated emoji grid plus a free-text
 * row for pasting any emoji. The optional sparkles button asks the backend LLM
 * for a suggestion based on the given name/description (same guidance as the
 * analysis pipeline).
 */

import { useState } from 'react'
import {
  ActionIcon,
  Group,
  Input,
  Popover,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconSparkles, IconX } from '@tabler/icons-react'
import { ApiClientError, llm } from '../../api/client'

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Documents',
    emojis: ['📄', '📃', '📑', '📜', '📋', '📝', '🧾', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚'],
  },
  {
    label: 'Folders & Office',
    emojis: ['📁', '📂', '🗂️', '🗃️', '🗄️', '📦', '✉️', '📧', '📨', '📤', '📥', '🖨️', '📎', '🖇️', '✂️', '📌'],
  },
  {
    label: 'Finance',
    emojis: ['💰', '💶', '💵', '💳', '🏦', '🧮', '📈', '📉', '📊', '🪙', '💸', '🏧'],
  },
  {
    label: 'Life & Topics',
    emojis: ['🏠', '🚗', '🏥', '💊', '🩺', '⚖️', '🛡️', '🔑', '👪', '🎓', '💼', '🛒', '✈️', '⚡', '💧', '🔥'],
  },
  {
    label: 'Time & Events',
    emojis: ['📅', '🗓️', '⏰', '🎂', '🎄', '🎉', '🏖️', '☀️'],
  },
  {
    label: 'Tech & Misc',
    emojis: ['💻', '📱', '🌐', '🔒', '🔧', '🧰', '📷', '🎵', '🎮', '🐾', '🌱', '⭐'],
  },
]

interface EmojiFieldProps {
  value: string
  onChange: (emoji: string) => void
  label?: string
  description?: string
  /** When set, shows the LLM-suggest button using this context. */
  suggest?: {
    kind: 'doc_type' | 'folder'
    name: string
    description?: string | null
  }
}

export default function EmojiField({
  value,
  onChange,
  label = 'Emoji',
  description,
  suggest,
}: EmojiFieldProps) {
  const [opened, setOpened] = useState(false)
  const [custom, setCustom] = useState('')
  const [suggesting, setSuggesting] = useState(false)

  const pick = (emoji: string) => {
    onChange(emoji)
    setCustom('')
    setOpened(false)
  }

  const handleSuggest = async () => {
    if (!suggest) return
    if (!suggest.name.trim()) {
      notifications.show({
        title: 'Name required',
        message: 'Enter a name first so the LLM has something to work with.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    setSuggesting(true)
    try {
      const result = await llm.suggestEmoji({
        kind: suggest.kind,
        name: suggest.name.trim(),
        description: suggest.description?.trim() || null,
      })
      onChange(result.emoji)
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Emoji suggestion failed'
      notifications.show({ title: 'Suggestion failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <Input.Wrapper label={label} description={description}>
      <Group gap={4} mt={4} wrap="nowrap">
        <Popover
          opened={opened}
          onChange={setOpened}
          position="bottom-start"
          width={320}
          shadow="md"
          trapFocus
        >
          <Popover.Target>
            <UnstyledButton
              onClick={() => setOpened((o) => !o)}
              aria-label="Pick an emoji"
              style={{
                width: 48,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'var(--mantine-color-default)',
              }}
            >
              {value || (
                <Text size="xs" c="dimmed">
                  —
                </Text>
              )}
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown p="sm">
            <Stack gap="sm">
              <TextInput
                size="xs"
                label="Paste or type any emoji"
                placeholder="e.g. 🧾"
                value={custom}
                onChange={(e) => {
                  const text = e.currentTarget.value
                  setCustom(text)
                  if (text.trim()) pick(text.trim())
                }}
              />
              <ScrollArea.Autosize mah={260}>
                <Stack gap="xs">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <Stack key={cat.label} gap={2}>
                      <Text size="xs" fw={600} c="dimmed">
                        {cat.label}
                      </Text>
                      <SimpleGrid cols={8} spacing={2}>
                        {cat.emojis.map((emoji) => (
                          <UnstyledButton
                            key={emoji}
                            onClick={() => pick(emoji)}
                            aria-label={`Pick ${emoji}`}
                            style={{
                              fontSize: 20,
                              textAlign: 'center',
                              borderRadius: 'var(--mantine-radius-sm)',
                              padding: 2,
                            }}
                          >
                            {emoji}
                          </UnstyledButton>
                        ))}
                      </SimpleGrid>
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        {suggest && (
          <Tooltip label="Suggest an emoji with the LLM (uses name & description)">
            <ActionIcon
              variant="light"
              size={36}
              loading={suggesting}
              onClick={handleSuggest}
              aria-label="Suggest emoji via LLM"
            >
              <IconSparkles size={18} />
            </ActionIcon>
          </Tooltip>
        )}

        {value && (
          <Tooltip label="Remove emoji">
            <ActionIcon
              variant="subtle"
              color="gray"
              size={36}
              onClick={() => onChange('')}
              aria-label="Remove emoji"
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Input.Wrapper>
  )
}

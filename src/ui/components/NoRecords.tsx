import { ActionIcon, Group, GroupProps, Text } from "@mantine/core"
import { IconDatabaseX } from "@tabler/icons-react"

export const NoRecords = (props: GroupProps) => {
  return (
    <Group spacing="xl" position="center" {...props}>
      <ActionIcon>
        <IconDatabaseX size="xl" />
      </ActionIcon>

      <Text>No records</Text>
    </Group>
  )
}

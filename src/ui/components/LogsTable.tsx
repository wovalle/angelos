import { Badge, Center, Pagination, ScrollArea, Stack, Table } from "@mantine/core"
import { Log } from "../../db/db"
import { NoRecords } from "./NoRecords"

type LogsTableProps = {
  logs: Log[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const OperationTypeBadge = ({ type }: { type: string | undefined }) => {
  if (!type) {
    return null
  }

  const color = type === "remove" ? "red" : undefined

  return <Badge color={color}>{type}</Badge>
}

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  totalPages,
  currentPage,
  onPageChange,
}) => {
  const rows = logs.map((row) => {
    return (
      <tr key={row.id}>
        <td>{row.id}</td>
        <td>{row.jobId}</td>
        <td>{row.hostname}</td>
        <td>
          <OperationTypeBadge type={row.operationType} />
        </td>
        <td>{row.timestamp}</td>
      </tr>
    )
  })

  const tBody = rows.length ? (
    rows
  ) : (
    <tr>
      <td colSpan={5}>
        <NoRecords p="20rem" />
      </td>
    </tr>
  )

  return (
    <ScrollArea>
      <Stack>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Id</th>
              <th>Job Id</th>
              <th>Hostname</th>
              <th>Operation</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>{tBody}</tbody>
        </Table>

        <Center>
          <Pagination total={totalPages} value={currentPage} onChange={onPageChange} />
        </Center>
      </Stack>
    </ScrollArea>
  )
}

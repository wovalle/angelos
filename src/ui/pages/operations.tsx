import { Alert, Center, Code } from "@mantine/core"
import { IconAlertCircle } from "@tabler/icons-react"
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next"
import { useRouter } from "next/router"
import { z } from "zod"
import Layout from "../components/Layout"
import { LogsTable } from "../components/LogsTable"
import { getAngelosContextFromReq } from "../getAngelosContextFromReq"

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { db } = getAngelosContextFromReq(context.req)

  const result = z
    .object({
      page: z
        .string()
        .default("1")
        .transform(Number)
        .refine((v) => !isNaN(v)),
      pageSize: z
        .string()
        .default(`20`)
        .transform(Number)
        .refine((v) => !isNaN(v)),
    })
    .safeParse(context.query)

  if (!result.success) {
    return {
      props: {
        error: result.error.flatten(),
      },
    }
  }

  const logs = await db.getLogs(result.data.page - 1, result.data.pageSize)
  const totalLogs = await db.getLogsCount()
  const totalPages = Math.ceil(totalLogs / result.data.pageSize)

  return {
    props: {
      logs,
      totalLogs,
      totalPages,
      currentPage: result.data.page,
    },
  }
}

const Home: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = (opts) => {
  const router = useRouter()

  const content = opts.error ? (
    <Center>
      <Alert
        icon={<IconAlertCircle size="1rem" />}
        title="Error"
        color="red"
        w="50rem"
        variant="outline"
        p="xl"
        mt="xl"
      >
        <>
          Something weird happened
          <Code block lang="json">
            {JSON.stringify(opts.error.fieldErrors, null, 2)}
          </Code>
        </>
      </Alert>
    </Center>
  ) : (
    <LogsTable
      logs={opts.logs}
      currentPage={opts.currentPage}
      totalPages={opts.totalPages}
      onPageChange={(page) => {
        router.replace({ query: { ...router.query, page } })
      }}
    />
  )

  return <Layout>{content}</Layout>
}

export default Home

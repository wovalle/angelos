import { Card, List, SimpleGrid, Table, Text } from "@mantine/core"
import { GetServerSidePropsContext, InferGetServerSidePropsType, NextPage } from "next"
import { ReactNode } from "react"
import { SystemSummary } from "../../lib/getSystemSummary"
import Layout from "../components/Layout"
import { NoRecords } from "../components/NoRecords"
import { getAngelosContextFromReq } from "../getAngelosContextFromReq"

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { getSummary } = getAngelosContextFromReq(context.req)
  const summary = getSummary()

  return {
    props: { summary },
  }
}

const SummaryCard = (opts: { title: string; content: ReactNode }) => (
  <Card
    withBorder
    radius="md"
    padding="xl"
    sx={(theme) => ({
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    })}
  >
    <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
      {opts.title}
    </Text>
    <Text fz="lg" fw={500}>
      {opts.content}
    </Text>
  </Card>
)

const ListCard = (opts: { title: string; children: ReactNode }) => (
  <Card
    withBorder
    radius="md"
    padding="xl"
    sx={(theme) => ({
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    })}
  >
    <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
      {opts.title}
    </Text>
    <Text fz="lg" fw={500}>
      {opts.children}
    </Text>
  </Card>
)

type Job = SystemSummary["pendingJobs"][number]

const JobsTable = (opts: { jobs: Job[] }) => {
  const rows = opts.jobs.map((j) => (
    <tr key={j.jobId}>
      <td>{j.jobId}</td>
      <td>{j.type}</td>
      <td>{JSON.stringify(j.meta)}</td>
    </tr>
  ))

  return (
    <Table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Type</th>
          <th>Meta</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </Table>
  )
}

const Home: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ summary }) => {
  return (
    <Layout>
      <>
        <SimpleGrid cols={4} spacing="xl" mt={50} breakpoints={[{ maxWidth: "md", cols: 2 }]}>
          <SummaryCard title="Up since" content={new Date(summary.upSince).toLocaleString()} />
          <SummaryCard title="Version" content={summary.version} />
          <SummaryCard title="Providers" content={summary.providers.length} />
          <SummaryCard title="Targets" content={summary.targets.length} />
        </SimpleGrid>
        <SimpleGrid cols={2} spacing="xl" mt={50}>
          <ListCard title="Providers">
            <List type="ordered">
              {summary.providers.map((t) => (
                <List.Item key={t.name}>{t.name}</List.Item>
              ))}
            </List>
          </ListCard>
          <ListCard title="Targets">
            <List type="ordered">
              {summary.targets.map((t) => (
                <List.Item key={t.name}>{t.name}</List.Item>
              ))}
            </List>
          </ListCard>
        </SimpleGrid>
        <SimpleGrid cols={1} spacing="xl" mt={50}>
          <ListCard title="Pending Jobs">
            {summary.pendingJobs.length ? (
              <JobsTable jobs={summary.pendingJobs} />
            ) : (
              <NoRecords p="10rem" />
            )}
          </ListCard>
        </SimpleGrid>
      </>
    </Layout>
  )
}

export default Home

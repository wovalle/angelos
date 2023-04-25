import { AppShell, Header } from "@mantine/core"
import Image from "next/image"
import { useRouter } from "next/router"
import AngelosNavbar from "../components/Navbar"

type LayoutProps = {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter()

  return (
    <AppShell
      padding="md"
      header={
        <Header height={60} p="xs">
          <Image src="/logo.svg" alt="logo" height={50} width={100} />
        </Header>
      }
      navbar={<AngelosNavbar active={router.pathname} />}
      styles={(theme) => ({
        main: {
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.gray[0],
        },
      })}
    >
      {children}
    </AppShell>
  )
}

export default Layout

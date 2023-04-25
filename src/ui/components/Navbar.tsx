import { Navbar, createStyles, getStylesRef, rem } from "@mantine/core"

import { IconDatabase, IconDeviceDesktop } from "@tabler/icons-react"
import Link from "next/link"

const useStyles = createStyles((theme) => ({
  navbar: {
    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
  },

  title: {
    textTransform: "uppercase",
    letterSpacing: rem(-0.25),
  },

  link: {
    ...theme.fn.focusStyles(),
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    fontSize: theme.fontSizes.sm,
    color: theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.gray[7],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontWeight: 500,

    "&:hover": {
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
      color: theme.colorScheme === "dark" ? theme.white : theme.black,

      [`& .${getStylesRef("icon")}`]: {
        color: theme.colorScheme === "dark" ? theme.white : theme.black,
      },
    },
  },

  linkIcon: {
    ref: getStylesRef("icon"),
    color: theme.colorScheme === "dark" ? theme.colors.dark[2] : theme.colors.gray[6],
    marginRight: theme.spacing.sm,
  },

  linkActive: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({ variant: "light", color: theme.primaryColor }).background,
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor }).color,
      [`& .${getStylesRef("icon")}`]: {
        color: theme.fn.variant({ variant: "light", color: theme.primaryColor }).color,
      },
    },
  },

  footer: {
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    paddingTop: theme.spacing.md,
  },
}))

const links = [
  { href: "/", id: "system", label: "System", Icon: IconDeviceDesktop },
  { href: "/operations", id: "operations", label: "Operations", Icon: IconDatabase },
]

const AngelosNavbar = (opts: { active: string }) => {
  const { classes, cx } = useStyles()

  const linkComponents = links.map((item) => (
    <Link
      className={cx(classes.link, { [classes.linkActive]: item.href === opts.active })}
      href={item.href}
      key={item.label}
    >
      <item.Icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ))

  return (
    <Navbar height="100%" width={{ sm: 300 }} p="md" className={classes.navbar}>
      <Navbar.Section grow mt="xl">
        {linkComponents}
      </Navbar.Section>
    </Navbar>
  )
}

export default AngelosNavbar

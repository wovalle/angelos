export type Host = {
  id: string
  name: string
  meta?: unknown
}

export type CloudflareHost = Host & {
  meta: {
    dnsRecordId: string | undefined
    tunnelId: string
    accountId: string
    zoneId: string
  }
}

export interface HostChange<T = Host> {
  type: "add" | "remove"
  host: T
}

type SubscribeCallback = (changes: HostChange[]) => void

export interface Provider {
  getName(): string
  setup(): Promise<void>
  getHosts(): Promise<Host[]>
  subscribe(cb: SubscribeCallback): void
}

export type Target<H = Host> = {
  getName(): string
  setup: () => Promise<void>
  getHosts: () => Promise<H[]>
  apply: (changes: HostChange<H>[]) => Promise<void>
}

export type EndpointTuple = ["get" | "post" | "put" | "delete", string]

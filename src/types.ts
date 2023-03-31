export interface Host<Meta = unknown> {
  id: string
  name: string
  meta?: Meta
}

export interface CloudflareMeta {
  dnsRecordId: string | undefined
}

export interface HostChange<ProviderMeta = unknown, TargetMeta = unknown> {
  type: "add" | "remove"
  host: Host
  providerMeta?: ProviderMeta
  targetMeta?: TargetMeta
}

type SubscribeCallback = (changes: HostChange[]) => void

export interface Provider {
  getName(): string
  setup(): Promise<void>
  getHosts(): Promise<Host[]>
  subscribe(cb: SubscribeCallback): void
}

export type Target<Meta = unknown> = {
  getName(): string
  setup: () => Promise<void>
  getHosts: () => Promise<Host<Meta>[]>
  apply: (changes: HostChange<unknown, Meta>[]) => Promise<void>
}

export type EndpointTuple = ["get" | "post" | "put" | "delete", string]

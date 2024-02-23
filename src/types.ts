import { Scheduler } from "./scheduler"

export type DefaultMeta = Record<string, unknown>

export interface Host<Meta = DefaultMeta> {
  id: string
  name: string
  meta?: Meta
}

export interface CloudflareMeta {
  dnsRecordId: string | undefined
}

export interface HostChange<ProviderMeta = DefaultMeta, TargetMeta = DefaultMeta> {
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
  subscribe(scheduler: Scheduler, cb: SubscribeCallback): void
}

export type Target<Meta = DefaultMeta> = {
  getName(): string
  setup: () => Promise<void>
  getHosts: () => Promise<Host<Meta>[]>
  apply: (changes: HostChange<DefaultMeta, Meta>[]) => Promise<void>
}

export type EndpointTuple = ["get" | "post" | "put" | "delete", string]

import { DNSRecord } from "../types/cloudflare"

type ContainerMockData = {
  id: string
  labels: Record<string, string>
}

export type RouterMockData = {
  status?: string
  provider?: string
  host: string | string[]
}

type DNSRecordMock = {
  id?: string
  name: string
  type?: DNSRecord["type"]
}

const getDockerMock = (data: ContainerMockData) => ({
  Id: data.id,
  Names: ["/filezilla"],
  Image: "jlesage/filezilla",
  ImageID: "sha256:37fdaffaa768749453952fbdeab3186c1ceb62bd699424a298b237406fda2028",
  Command: "/init",
  Created: 1635347733,
  Ports: [
    { IP: "0.0.0.0", PrivatePort: 5800, PublicPort: 5800, Type: "tcp" },
    { IP: "::", PrivatePort: 5800, PublicPort: 5800, Type: "tcp" },
  ],
  Labels: {
    "desktop.docker.io/binds/0/Source": "/Users/angelos/personal/filezilla",
    "desktop.docker.io/binds/0/SourceKind": "hostFile",
    "desktop.docker.io/binds/0/Target": "/config",
    "desktop.docker.io/binds/1/Source": "/Users/angelos/personal/filezilla",
    "desktop.docker.io/binds/1/SourceKind": "hostFile",
    "desktop.docker.io/binds/1/Target": "/storage",
    "org.label-schema.description": "Docker container for FileZilla",
    "org.label-schema.name": "filezilla",
    "org.label-schema.schema-version": "1.0",
    "org.label-schema.vcs-url": "https://github.com/jlesage/docker-filezilla",
    "org.label-schema.version": "1.32.1",
    ...data.labels,
  },
  State: "running",
  Status: "Up 2 minutes",
  HostConfig: { NetworkMode: "default" },
  NetworkSettings: {
    Networks: {
      bridge: {
        IPAMConfig: null,
        Links: null,
        Aliases: null,
        NetworkID: "386ebb7f53cd39499117f343042b0972fdd6666a648519e7d1f1676fd6378c87",
        EndpointID: "5c3ec143ea7b19310689f6465627fd2a4e9ce4b4be5333020eda326cce5c7d7",
        Gateway: "172.17.0.1",
        IPAddress: "172.17.0.2",
        IPPrefixLen: 16,
        IPv6Gateway: "",
        GlobalIPv6Address: "",
        GlobalIPv6PrefixLen: 0,
        MacAddress: "00:00:ac:00:00:00",
        DriverOpts: null,
      },
    },
  },
  Mounts: [
    {
      Type: "bind",
      Source: "/host_mnt/Users/angelos/personal/filezilla",
      Destination: "/config",
      Mode: "rw",
      RW: true,
      Propagation: "rprivate",
    },
    {
      Type: "bind",
      Source: "/host_mnt/Users/angelos/personal/filezilla",
      Destination: "/storage",
      Mode: "rw",
      RW: true,
      Propagation: "rprivate",
    },
  ],
})

export const getDockerContainersMock = (data: ContainerMockData[]) =>
  data.map((d) => getDockerMock(d))

export const getCloudflareMock = ({ id, name, type }: DNSRecordMock): DNSRecord => ({
  id: id ?? name,
  zone_id: "zone1",
  zone_name: "angelos.rocks",
  name,
  type: type ?? "CNAME",
  content: "tunnel-uuid.cfargotunnel.com",
  proxiable: true,
  proxied: true,
  ttl: 1,
  locked: false,
  meta: {
    auto_added: false,
    managed_by_apps: false,
    managed_by_argo_tunnel: false,
    source: "primary",
    managed_by_web3: false,
  },
  created_on: new Date().toUTCString(),
  modified_on: new Date().toUTCString(),
  data: undefined,
  comment: undefined,
  priority: undefined,
  tags: undefined,
})

export const getCloudflareRecordsMock = (data: DNSRecordMock[]) => ({
  result: data.map((d) => getCloudflareMock(d)),
  success: true,
  errors: [],
  messages: [],
  result_info: {
    page: 1,
    per_page: 20,
    count: data.length,
    total_count: data.length,
    total_pages: 1,
  },
})

const mapBackTicks = (host: string) => "`" + host + "`"

export const getTraefikMock = ({ status, provider, host }: RouterMockData) => {
  const extractServiceName = (host: string) =>
    host.split(".").length > 2 ? host.split(".")[0] : "@"
  return {
    entryPoints: ["traefik"],
    service: Array.isArray(host)
      ? host.map(extractServiceName).join(",")
      : extractServiceName(host),
    rule: `Host(${Array.isArray(host) ? host.map(mapBackTicks).join(", ") : mapBackTicks(host)})`,
    priority: 2147483646,
    status: status ?? "active",
    using: ["traefik"],
    name: "api@internal",
    provider: provider ?? "docker",
  }
}

export const getTraefikRecordsMock = (data: RouterMockData[]) => data.map((d) => getTraefikMock(d))

export const getCloudflareTunnelsMock = () => ({
  success: true,
  messages: [],
  errors: [],
  result: [
    {
      id: "tunnel-1",
      account_tag: "account",
      created_at: "2023-01-25T11:24:38.313978Z",
      deleted_at: null,
      name: "tunnel-1-name",
      connections: [
        {
          colo_name: "TXL",
          uuid: "conn1",
          id: "conn1",
          is_pending_reconnect: false,
          origin_ip: "1.1.1.1",
          opened_at: "2023-03-23T00:37:59.386112Z",
          client_id: "client_id",
          client_version: "2023.2.1",
        },
        {
          colo_name: "VIE",
          uuid: "conn2",
          id: "conn2",
          is_pending_reconnect: false,
          origin_ip: "1.1.1.1",
          opened_at: "2023-03-23T00:47:28.246390Z",
          client_id: "client_id",
          client_version: "2023.2.1",
        },
      ],
      conns_active_at: "2023-03-21T22:10:55.625648Z",
      conns_inactive_at: null,
      tun_type: "cfd_tunnel",
      metadata: {},
      status: "healthy",
      remote_config: true,
    },
    {
      id: "tunnel-2",
      account_tag: "account_id",
      created_at: "2022-11-28T12:43:32.011432Z",
      deleted_at: "2022-11-28T14:50:09.627508Z",
      name: "tunnel-2-name",
      connections: [],
      conns_active_at: null,
      conns_inactive_at: "2022-11-28T14:50:09.627508Z",
      tun_type: "cfd_tunnel",
      metadata: {},
      status: "down",
      remote_config: false,
    },
  ],
})

type ServiceMock = [string, string]

/**
 * [
          {
            service: "http://internal.url",
            hostname: "external.url",
            originRequest: {},
          },
          {
            service: "http_status:404",
          },
        ]
  */
export const getCloudflareTunnelConfigurationMock = (
  services: ServiceMock[],
  withCatchAll: boolean = false
) => {
  const ingress = services.map(([external, internal]) => ({
    hostname: external,
    service: internal,
  }))

  return {
    success: true,
    messages: [],
    errors: [],
    result: {
      tunnel_id: "76c9f077-0cdb-44e3-8187-4cb19ee1c055",
      version: 27,
      config: {
        ingress: withCatchAll ? [...ingress, { service: "http_status:404" }] : ingress,
        "warp-routing": {
          enabled: false,
        },
      },
      source: "cloudflare",
      created_at: "2023-03-30T07:54:04.137936Z",
    },
  }
}

export const getCloudflareVerifyTokenMock = (status: string = "active") => ({
  success: true,
  result: { status },
})

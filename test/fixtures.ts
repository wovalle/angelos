import { DNSRecord } from "@cloudflare/types";

type ContainerMockData = {
  id: string;
  labels: Record<string, string>;
};

type DNSRecordMock = {
  id?: string;
  name: string;
  type?: DNSRecord["type"];
};

const getDockerMock = (data: ContainerMockData) => ({
  Id: data.id,
  Names: ["/filezilla"],
  Image: "jlesage/filezilla",
  ImageID: "sha256:37fdaffaa768749453952fbdeab3186c1ceb62bd699424a298b237406fda2028",
  Command: "/init",
  Created: 1635347733,
  Ports: [
    { PrivatePort: 5900, Type: "tcp" },
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
});

export const getDockerContainersMock = (data: ContainerMockData[]) =>
  data.map((d) => getDockerMock(d));

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
  },
  created_on: new Date().toUTCString(),
  modified_on: new Date().toUTCString(),
});

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
});

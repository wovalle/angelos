import axios, { Axios } from "axios";
import type { Logger } from "tslog";

type Container = {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  Ports: Record<string, unknown>[];
  Labels: Record<string, string>;
  State: string;
  Status: string;
  HostConfig: Record<string, unknown>;
  NetworkSettings: Object;
  Mounts: Array<Object>;
};

export class DockerApi {
  private client: Axios;

  constructor(
    private logger: Logger,
    sock: string,
    dockerApiHost: string,
    private dockerLabelHostname: string,
    private dockerLabelEnable: string
  ) {
    this.client = axios.create({
      socketPath: sock,
      baseURL: dockerApiHost,
    });
  }

  getContainers = async () => {
    const client = await this.client.get("/containers/json");

    const containers = client.data as Container[];
    return containers.filter((c) => c.Labels[this.dockerLabelHostname]);
  };

  getDockerContainerHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => c.Labels[this.dockerLabelHostname]);
  };
}

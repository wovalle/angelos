import { Axios } from "axios";
import type { Logger } from "tslog";
import { getAxiosInstance } from "./utils";

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
    this.client = getAxiosInstance(logger, {
      socketPath: sock,
      baseURL: dockerApiHost,
    });
  }

  getContainers = async () => {
    const client = await this.client.get<Container[]>("/containers/json");

    const containers = client.data.filter((c) => c.Labels[this.dockerLabelHostname]);

    this.logger.debug(
      "[Get Docker Containers]",
      containers.map((c) => [c.Id, c.Labels[this.dockerLabelHostname]])
    );

    this.logger.silly("[Get Docker Containers Raw]", client.data);

    return containers;
  };

  getDockerContainerHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => c.Labels[this.dockerLabelHostname]);
  };
}

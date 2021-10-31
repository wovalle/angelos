import { Axios } from "axios";
import type { Logger } from "tslog";
import env from "./env";
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
  private sock: string;
  private apiHost: string;
  private labelHostname: string;
  private labelEnable: string;

  constructor(private logger: Logger) {
    this.apiHost = env.dockerApiHost;
    this.labelHostname = env.dockerLabelHostname;
    this.labelEnable = env.dockerLabelEnable;
    this.sock = env.dockerSock;

    this.client = getAxiosInstance(logger, {
      socketPath: this.sock,
      baseURL: this.apiHost,
    });
  }

  getContainers = async () => {
    const client = await this.client.get<Container[]>("/containers/json");
    const containers = client.data.filter((c) => c.Labels[this.labelHostname]);

    this.logger.debug(
      "[Get Docker Containers]",
      containers.map((c) => [c.Id, c.Labels[this.labelHostname]])
    );

    this.logger.silly("[Get Docker Containers Raw]", client.data);

    return containers;
  };

  getDockerContainerHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => c.Labels[this.labelHostname]);
  };
}

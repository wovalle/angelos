import axios, { Axios } from "axios";
import { Logger } from "tslog";

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

  constructor(private logger: Logger, sock: string, apiBaseUrl: string) {
    this.client = axios.create({
      socketPath: sock,
      baseURL: apiBaseUrl,
    });
  }

  getContainers = async (labelFilter?: string) => {
    const client = await this.client.get("/containers/json");

    return client.data as Container[];
  };
}

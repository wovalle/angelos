import { Docker } from "node-docker-api";
import { Container } from "node-docker-api/lib/container";
import { Logger } from "tslog";

type ContainerWithData = Container & {
  data: {
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
};

export class DockerApi {
  private client: Docker;

  constructor(private sock: string, private logger: Logger) {
    this.client = new Docker({ socketPath: sock });
  }

  getDockerContainers = async (filter?: string) => {
    const containers = (await this.client.container.list()) as ContainerWithData[];

    return filter ? containers.filter((c) => c.data.Labels[filter]) : containers;
  };
}

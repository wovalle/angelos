import Docker from "dockerode";
import { getDockerEnv } from "../env";
import { Logger } from "../lib/logger";
import { HostChange, Provider } from "../types";

interface DockerEvent {
  status: string;
  id: string;
  from: string;
  Type: string;
  Action: string;
  Actor: {
    ID: string;
    Attributes: Record<string, string> & {
      image: string;
      name: string;
      signal: string;
      exitCode: string;
      container: string;
      type: string;
    };
  };
  scope: string;
  time: number;
  timeNano: BigInt;
}

export class DockerProvider implements Provider {
  private labelHostname: string;
  private labelEnable: string;
  private dockerClient: Docker;
  private logger: Logger;

  constructor(logger: Logger) {
    const { DOCKER_LABEL_HOSTNAME, DOCKER_LABEL_ENABLE } = getDockerEnv();

    this.labelHostname = DOCKER_LABEL_HOSTNAME;
    this.labelEnable = DOCKER_LABEL_ENABLE;
    this.dockerClient = new Docker();
    this.logger = logger;
  }

  getName() {
    return "docker";
  }

  async setup(): Promise<void> {
    const dockerEnv = getDockerEnv();
    this.logger.info(`Docker Label Hostname=${dockerEnv.DOCKER_LABEL_HOSTNAME}`);
    this.logger.info(`Docker Label Enable=${dockerEnv.DOCKER_LABEL_ENABLE}`);

    const containers = await this.dockerClient.listContainers();

    if (!containers || containers.length) {
      this.logger.error("[Docker Connection]", "Error connecting to docker", {
        data: containers,
      });

      throw new Error("Invalid listContainers result");
    }

    this.logger.info("[Docker Connection]", "Connection verified");
  }

  subscribe(cb: (changes: HostChange[]) => void): void {
    this.dockerClient.getEvents(
      { filters: { event: ["start", "stop", "kill", "die"] } },
      (error, stream) => {
        if (error) {
          this.logger.error("[Docker Event Error]", error);
        }

        stream?.on("data", (data) => {
          const event = JSON.parse(data) as DockerEvent;
          const hostname = this.getHostName(event.Actor.Attributes);

          this.logger.info("[Docker Event]", event.status, hostname);
          this.logger.silly("[Docker Event]", event);

          if (event.status === "start") {
            cb([{ type: "add", host: { id: event.id, name: hostname } }]);
          } else {
            cb([{ type: "remove", host: { id: event.id, name: hostname } }]);
          }
        });
      }
    );
  }

  getContainers = async () => {
    const containers = await this.dockerClient.listContainers();
    const filteredContainer = containers.filter((c) => {
      return (
        this.getHostName(c.Labels) &&
        (this.labelEnable ? c.Labels[this.labelEnable] === "true" : true)
      );
    });

    this.logger.debug(
      "[Get Docker Containers]",
      filteredContainer.map((c) => [c.Id, this.getHostName(c.Labels)])
    );

    this.logger.silly("[Get Docker Containers Raw]", containers);

    return filteredContainer;
  };

  getHostName(labels: Record<string, string>) {
    return labels[this.labelHostname];
  }

  async getHosts() {
    const containers = await this.getContainers();

    return containers.map((c) => ({ id: c.Id, name: this.getHostName(c.Labels) }));
  }
}

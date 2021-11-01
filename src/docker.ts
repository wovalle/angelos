import type { Logger } from "tslog";
import env from "./env";
import Docker from "dockerode";

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

export class DockerApi {
  private labelHostname: string;
  private labelEnable: string;
  private dockerClient: Docker;

  constructor(private logger: Logger) {
    this.labelHostname = env.dockerLabelHostname;
    this.labelEnable = env.dockerLabelEnable;
    this.dockerClient = new Docker();
  }

  testConnection = async () => {
    const containers = await this.dockerClient.listContainers();

    if (!containers || containers.length) {
      this.logger.error("[Docker Connection]", "Error connecting to docker", {
        data: containers,
      });

      throw new Error("Invalid listContainers result");
    }

    this.logger.info("[Docker Connection]", "Connection verified");
  };

  getContainers = async () => {
    const containers = await this.dockerClient.listContainers();
    const filteredContainer = containers.filter((c) => c.Labels[this.labelHostname]);

    this.logger.debug(
      "[Get Docker Containers]",
      filteredContainer.map((c) => [c.Id, c.Labels[this.labelHostname]])
    );

    this.logger.silly("[Get Docker Containers Raw]", containers);

    return filteredContainer;
  };

  getHost(labels: Record<string, string>) {
    return labels[this.labelHostname];
  }

  getDockerContainerHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => this.getHost(c.Labels));
  };

  subscribeToChanges = (
    callback: (eventType: "AddDnsRecord" | "DeleteDnsRecord", host: string) => void
  ) => {
    this.dockerClient.getEvents(
      { filters: { event: ["start", "stop", "kill", "die"] } },
      (error, stream) => {
        if (error) {
          this.logger.error("[Docker Event Error]", error);
        }

        stream?.on("data", (data) => {
          const event = JSON.parse(data) as DockerEvent;
          const hostname = this.getHost(event.Actor.Attributes);

          this.logger.info("[Docker Event]", event.status, hostname);
          this.logger.silly("[Docker Event]", event);

          callback(event.status === "start" ? "AddDnsRecord" : "DeleteDnsRecord", hostname);
        });
      }
    );
  };
}

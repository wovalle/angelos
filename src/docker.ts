import type { Logger } from "tslog";
import env from "./env";
import Docker from "dockerode";
import { IMetadataProvider } from "./types";

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

export class DockerClient implements IMetadataProvider {
  private labelHostname: string;
  private labelEnable: string;
  private dockerClient: Docker;

  constructor(private logger: Logger) {
    this.labelHostname = env.dockerLabelHostname;
    this.labelEnable = env.dockerLabelEnable;
    this.dockerClient = new Docker();
    logger.setSettings({ name: "DockerClient" });
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
    const filteredContainer = containers.filter((c) => {
      return (
        this.getHost(c.Labels) && (this.labelEnable ? c.Labels[this.labelEnable] === "true" : true)
      );
    });

    this.logger.debug(
      "[Get Docker Containers]",
      filteredContainer.map((c) => [c.Id, this.getHost(c.Labels)])
    );

    this.logger.silly("[Get Docker Containers Raw]", containers);

    return filteredContainer;
  };

  getHost(labels: Record<string, string>) {
    return labels[this.labelHostname];
  }

  getHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => this.getHost(c.Labels));
  };

  subscribeToChanges = (opts: {
    scheduleAddDnsRecord: (hostname: string) => void;
    scheduleDeleteDnsRecord: (hostname: string) => void;
  }) => {
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

          if (event.status === "start") {
            opts.scheduleAddDnsRecord(hostname);
          } else {
            opts.scheduleDeleteDnsRecord(hostname);
          }
        });
      }
    );
  };
}

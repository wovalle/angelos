import type { Logger } from "tslog";
import env from "./env";
import Docker from "dockerode";

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

  getDockerContainerHosts = async () => {
    const containers = await this.getContainers();

    return containers.map((c) => c.Labels[this.labelHostname]);
  };
}

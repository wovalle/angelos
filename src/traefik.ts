import type { Logger } from "tslog";
import env from "./env";
import { IMetadataProvider } from "./types";
import { getAxiosInstance } from "./utils";
import { Axios } from "axios";
import { Scheduler } from "./scheduler";

interface Router {
  entryPoints: string[];
  service: string;
  rule: string;
  priority: number;
  status: string;
  using: string[];
  name: string;
  provider: string;
  middlewares: string[];
  tls: {
    certResolver: string;
  };
}

export class TraefikClient implements IMetadataProvider {
  private client: Axios;
  private cache: string[] = [];

  constructor(private logger: Logger) {
    this.client = getAxiosInstance(logger, {
      baseURL: env.traefikApiUrl,
    });
    logger.setSettings({ name: "TraefikClient" });
  }

  testConnection = async () => {};

  // TODO: change with a serializable query, maybe with mongo query syntax
  getHosts = async () => {
    const { data: routers } = await this.client.get<Router[]>("http/routers");

    this.logger.silly("[Fetch Router Raw]", routers);

    const extractHosts = (rule: string) => {
      const hostRegex = /Host\(([^\)]*)\)/;

      const [_, hosts] = hostRegex.exec(rule) || ["", ""];
      return hosts
        .replace(/\`/g, "")
        .split(",")
        .map((h) => h.trim());
    };

    const hosts = routers
      .filter((r) => r.status === "enabled" && r.rule && r.provider !== "internal")
      .map((r) => extractHosts(r.rule))
      .flat();

    const hostsWithoutDuplicates = [...new Set(hosts)];

    this.cache = hostsWithoutDuplicates;

    this.logger.debug("[Get Traefik Hosts]", hostsWithoutDuplicates);

    return hostsWithoutDuplicates;
  };

  subscribeToChanges = (opts: {
    scheduleAddDnsRecord: (hostname: string) => void;
    scheduleDeleteDnsRecord: (hostname: string) => void;
    scheduler: Scheduler;
  }) => {
    this.logger.info(
      "[Traefik]",
      `Traefik doesn't have live events so we're polling every ${env.traefikPollInterval} seconds`
    );

    opts.scheduler.scheduleIntervalJob({
      type: "TraefikEvents",
      jobId: "I don't even know why this is required",
      fn: async () => {
        this.logger.info("[Traefik Events]", "Polling...");
        const hosts = await this.getHosts();
        const toAdd = hosts.filter((h) => !this.cache.includes(h));
        const toDelete = this.cache.filter((h) => !hosts.includes(h));

        if (toAdd.length > 0) {
          this.logger.info("[Traefik Events]", `Adding ${toAdd.length} hosts`);
          toAdd.forEach((h) => opts.scheduleAddDnsRecord(h));
        }

        if (toDelete.length > 0) {
          this.logger.info("[Traefik Events]", `Deleting ${toDelete.length} hosts`);
          toDelete.forEach((h) => opts.scheduleDeleteDnsRecord(h));
        }
      },
      intervalTimeInSeconds: env.traefikPollInterval,
    });
  };
}

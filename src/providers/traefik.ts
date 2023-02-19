import { Axios } from "axios";
import { getTraefikEnv } from "../env";
import { Logger } from "../lib/logger";
import { Scheduler } from "../scheduler";
import { IMetadataProvider } from "../types";
import { getAxiosInstance } from "../utils";

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
  private pollInterval: number;

  constructor(private logger: Logger) {
    const traefikEnv = getTraefikEnv();
    this.client = getAxiosInstance(logger, {
      baseURL: traefikEnv.TRAEFIK_API_URL,
    });

    this.logger = logger;
    this.pollInterval = traefikEnv.TRAEFIK_POLL_INTERVAL;
  }

  testConnection = async () => {
    const res = await this.client.get("version").catch((e: any) => {
      this.logger.silly("[Traefik Test Connection Raw Error]", e.response);

      this.logger.fatal("[Traefik Test Connection]", "Error verifying connection", {
        data: e.response.data,
      });

      throw new Error("Error verifying traefik connection");
    });

    this.logger.info("[Traefik Test Connection]", "Connection verified");
  };

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
        .map((h) => h.trim())
        .filter(Boolean);
    };

    const hosts = routers
      .filter((r) => r.status === "enabled" && r.rule && r.provider !== "internal")
      .map((r) => extractHosts(r.rule))
      .flat();

    const hostsWithoutDuplicates = [...new Set(hosts)];

    this.logger.debug("[Get Traefik Hosts]", hostsWithoutDuplicates.join(", "));

    return hostsWithoutDuplicates;
  };

  subscribeToChanges = (opts: {
    scheduleAddDnsRecord: (hostname: string) => void;
    scheduleDeleteDnsRecord: (hostname: string) => void;
    scheduler: Scheduler;
  }) => {
    this.logger.info(
      "[Traefik]",
      `Traefik doesn't support live events so we're polling every ${this.pollInterval} seconds`
    );

    opts.scheduler.scheduleIntervalJob({
      type: "TraefikEvents",
      jobId: "Traefik Events",
      fn: async () => {
        this.logger.debug("[Traefik Events]", "Polling...");

        const hosts = await this.getHosts();

        const toAdd = hosts.filter((h) => !this.cache.includes(h));
        const toDelete = this.cache.filter((h) => !hosts.includes(h));

        this.cache = hosts;

        if (toAdd.length > 0) {
          this.logger.info(
            "[Traefik Events]",
            `${toAdd.length} new host(s) found: ${toAdd.join(", ")}`,
            "Scheduling insertion..."
          );
          toAdd.forEach((h) => opts.scheduleAddDnsRecord(h));
        }

        if (toDelete.length > 0) {
          this.logger.info(
            "[Traefik Events]",
            `${toDelete.length} host(s) have been deleted: ${toDelete.join(", ")}`,
            "Scheduling deletion..."
          );
          toDelete.forEach((h) => opts.scheduleDeleteDnsRecord(h));
        }
      },
      intervalTimeInSeconds: this.pollInterval,
    });
  };
}

import type { DNSRecord } from "@cloudflare/types";
import { Axios } from "axios";
import { env, getCloudflareDNSEnv } from "../env";
import { Logger } from "../lib/logger";
import { Host, HostChange, Target } from "../types";
import { getAxiosInstance } from "../utils";

type CloudflareResponse<T> = {
  success: boolean;
  errors: { code: number; message: string };
  result: T;
  result_info: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
    total_pages: number;
  };
};

export class CloudflareDNSTarget implements Target {
  private client: Axios;
  private token: string;
  private zone: string;
  private tunnelId: string;
  private cache: DNSRecord[];

  constructor(private logger: Logger) {
    const cfDnsEnv = getCloudflareDNSEnv();

    this.token = cfDnsEnv.CLOUDFLARE_API_TOKEN;
    this.zone = cfDnsEnv.CLOUDFLARE_ZONE_ID;
    this.tunnelId = cfDnsEnv.CLOUDFLARE_TUNNEL_UUID;
    this.cache = [];

    this.client = getAxiosInstance(logger, {
      method: "get",
      baseURL: "https://api.cloudflare.com/client/v4",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-type": "application/json",
      },
      data: {},
    });
  }

  getName(): string {
    return "cloudflare-dns";
  }

  async setup(): Promise<void> {
    const res = await this.client.get("user/tokens/verify").catch((e: any) => {
      this.logger.silly("[Cloudflare Token Verify Raw Error]", e);

      return {
        data: {
          success: false,
          error: e.message,
        },
      };
    });

    if (!res.data.success) {
      this.logger.error("[Cloudflare Token Verify]", "Error verifying token", {
        data: res.data,
      });

      throw new Error("Error verifying cloudflare token");
    }

    this.logger.info("[Cloudflare Token Verify]", "Connection verified");
  }

  async getHosts(): Promise<Host[]> {
    const query = "type=CNAME&per_page=100";
    const response = await this.client.get<CloudflareResponse<DNSRecord[]>>(
      `zones/${this.zone}/dns_records?${query}`
    );

    const records = response.data.result || [];

    // Reseting cache
    this.cache = records;

    this.logger.debug(
      "[Fetch DNS Records]",
      "Dns Records fetched from cloudflare:",
      records.map((r) => r.name).join(", ")
    );

    return records.map((r) => ({ id: r.id ?? "", name: r.name }));
  }

  async apply(operations: HostChange[]): Promise<void> {
    const basePath = `zones/${this.zone}/dns_records`;

    for (const change of operations) {
      switch (change.type) {
        case "add":
          const url = `${basePath}`;
          const data = {
            type: "CNAME",
            name: change.host,
            content: `${this.tunnelId}.cfargotunnel.com`,
            ttl: 1,
            priority: 10,
            proxied: true,
          };

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "Skipping DNS Record Create because Dry Run mode is true",
              url,
              data
            );
            continue;
          }

          await this.client.post(url, data);

          this.logger.info(
            "[DNS Record Create]",
            `CNAME Record with name ${change.host} was created in zone ${this.zone}`
          );

          break;

        case "remove":
          const ids = this.cache.filter((r) => change.host.name === r.name);

          if (!ids.length) {
            this.logger.warn(
              "[DNS Record Delete]",
              `CNAME Record with name ${change.host} was not found in zone ${this.zone}`
            );

            continue;
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "Skipping DNS Record Create because Dry Run mode is true",
              `With ids: ${ids}`
            );
            continue;
          }

          await Promise.all(ids.map((r) => this.client.delete(`${basePath}/${r.id}`)));

          this.logger.info(
            "[DNS Record Delete]",
            `CNAME Record with id ${ids} was deleted in zone ${this.zone}`
          );

          break;

        default:
          this.logger.error("[DNS Record Update]", `Unknown operation type ${change.type}`);

          break;
      }
    }
  }
}

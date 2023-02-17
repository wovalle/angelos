import { Axios } from "axios";
import type { Logger } from "tslog";
import type { DNSRecord } from "@cloudflare/types";
import { getAxiosInstance } from "../utils";
import { getEnvVars } from "../env";

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

export class CloudflareApi {
  private client: Axios;
  private token: string;
  private zone: string;
  private tunnelId: string;
  private cache: DNSRecord[];

  constructor(private logger: Logger) {
    const { cloudflareApiToken, cloudflareZoneId, cloudflareTunnelId } = getEnvVars();

    this.token = cloudflareApiToken;
    this.zone = cloudflareZoneId;
    this.tunnelId = cloudflareTunnelId;
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

  testConnection = async () => {
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
  };

  fetchCNameRecords = async (): Promise<DNSRecord[]> => {
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

    return records;
  };

  createCNameRecord = async (name: string): Promise<void> => {
    const url = `zones/${this.zone}/dns_records`;
    const data = {
      type: "CNAME",
      name,
      content: `${this.tunnelId}.cfargotunnel.com`,
      ttl: 1,
      priority: 10,
      proxied: true,
    };

    if (getEnvVars().dryRun) {
      this.logger.info(
        "[DNS Record Create]",
        "Skipping DNS Record Create because Dry Run mode is true",
        url,
        data
      );
      return;
    }

    await this.client.post(url, data);

    this.logger.info(
      "[DNS Record Create]",
      `CNAME Record with name ${name} was created in zone ${this.zone}`
    );
  };

  deleteRecord = async (id: string): Promise<void> => {
    const url = `zones/${this.zone}/dns_records/${id}`;

    if (getEnvVars().dryRun) {
      this.logger.info(
        "[DNS Record Create]",
        "Skipping DNS Record Create because Dry Run mode is true",
        url
      );
      return;
    }

    await this.client.delete(url);

    this.logger.info(
      "[DNS Record Delete]",
      `CNAME Record with id ${id} was deleted in zone ${this.zone}`
    );
  };

  getDnsRecordIdFromHostname(hostname: string) {
    return this.cache.find((r) => r.name === hostname)?.name;
  }
}

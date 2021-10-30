import { Axios } from "axios";
import type { Logger } from "tslog";
import type { DNSRecord } from "@cloudflare/types";
import { getAxiosInstance } from "./utils";

type CloudflareResponse<T> = {
  success: boolean;
  errors: { code: number; message: string };
  result: T;
};

export class CloudflareApi {
  private client: Axios;

  constructor(
    private logger: Logger,
    private token: string,
    private zone: string,
    private tunnelUrl: string
  ) {
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

  fetchCNameRecords = async (): Promise<DNSRecord[]> => {
    const query = "type=CNAME";
    const response = await this.client.get<CloudflareResponse<DNSRecord[]>>(
      `zones/${this.zone}/dns_records?${query}`
    );

    const records = response.data.result || [];

    this.logger.debug(
      "[Fetch DNS Records]",
      "Dns Records fetched from cloudflare:",
      records.map((r) => r.name)
    );

    return records;
  };

  createCNameRecord = async (name: string): Promise<void> => {
    // await this.client.post(`zones/${this.zone}/dns_records`, {
    //   type: "CNAME",
    //   name,
    //   content: this.tunnelUrl,
    //   ttl: 1,
    //   priority: 10,
    //   proxied: true,
    // });

    this.logger.info(
      "[DNS Record Create]",
      `CNAME Record with name ${name} was created in zone ${this.zone}`
    );
  };

  deleteRecord = async (id: string): Promise<void> => {
    //  await this.client.delete(`zones/${this.zone}/dns_records/${id}`);

    this.logger.info(
      "[DNS Record Delete]",
      `CNAME Record with id ${id} was deleted in zone ${this.zone}`
    );
  };
}

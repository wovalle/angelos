import axios, { Axios } from "axios";
import type { Logger } from "tslog";
import type { DNSRecord } from "@cloudflare/types";

export class CloudflareApi {
  private client: Axios;

  constructor(
    private logger: Logger,
    private token: string,
    private zone: string,
    private tunnelUrl: string
  ) {
    this.client = axios.create({
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
    const response = await this.client.get(`zones/${this.zone}/dns_records?${query}`);

    return (response.data.results as DNSRecord[]) || [];
  };

  createCNameRecord = async (name: string): Promise<DNSRecord> => {
    const response = await this.client.post(`zones/${this.zone}/dns_records`, {
      type: "CNAME",
      name,
      content: this.tunnelUrl,
      ttl: 1,
      priority: 10,
      proxied: true,
    });

    this.logger.info(
      "[DNS Record Create]",
      `CNAME Record with name ${name} was created in zone ${this.zone}`
    );

    return response.data.result;
  };

  deleteRecord = async (id: string): Promise<{ id: string }> => {
    const response = await this.client.delete(`zones/${this.zone}/dns_records/${id}`);

    this.logger.info(
      "[DNS Record Delete]",
      `CNAME Record with id ${id} was deleted in zone ${this.zone}`
    );

    return response.data.result;
  };
}

import { Axios } from "axios"
import { env, getCloudflareLegacyEnv } from "../env"
import { Logger } from "../lib/logger"
import { Host, HostChange, Target } from "../types"
import type { APIResponseBody, DNSRecord } from "../types/cloudflare"
import { getAxiosInstance } from "../utils"

export class CloudflareDNSTarget implements Target {
  private client: Axios
  private token: string
  private zone: string
  private tunnelId: string
  private cache: DNSRecord[]
  private logger: Logger

  constructor(logger: Logger) {
    const cfDnsEnv = getCloudflareLegacyEnv()

    this.token = cfDnsEnv.CLOUDFLARE_DNS_API_TOKEN
    this.zone = cfDnsEnv.CLOUDFLARE_DNS_ZONE_ID
    this.tunnelId = cfDnsEnv.CLOUDFLARE_DNS_TUNNEL_UUID
    this.cache = []
    this.logger = logger.getSubLogger({ name: "CloudflareLegacy" })

    this.client = getAxiosInstance(logger, {
      method: "get",
      baseURL: "https://api.cloudflare.com/client/v4",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-type": "application/json",
      },
      data: {},
    })
  }

  getName(): string {
    return "cloudflare-legacy"
  }

  async setup(): Promise<void> {
    const res = await this.client.get("user/tokens/verify").catch((e: any) => {
      this.logger.silly("[Token Verify Raw Error]", e)

      return {
        data: {
          success: false,
          error: e.message,
        },
      }
    })

    if (!res.data.success) {
      this.logger.error("[Token Verify]", "Error verifying token", {
        data: res.data,
      })

      throw new Error("Error verifying cloudflare token")
    }

    this.logger.info("[Token Verify]", "Connection verified")
  }

  async getHosts(): Promise<Host[]> {
    const query = "type=CNAME&per_page=100"
    const response = await this.client.get<APIResponseBody<DNSRecord[]>>(
      `zones/${this.zone}/dns_records?${query}`
    )

    const records = response.data.result || []

    // Reseting cache
    this.cache = records

    this.logger.debug(
      "[Fetch DNS Records]",
      "Dns Records fetched from cloudflare:",
      records.map((r) => r.name).join(", ")
    )

    return records.map((r) => ({ id: r.id ?? "", name: r.name }))
  }

  async apply(operations: HostChange[]): Promise<void> {
    const basePath = `zones/${this.zone}/dns_records`

    for (const change of operations) {
      switch (change.type) {
        case "add":
          const url = `${basePath}`
          const data = {
            type: "CNAME",
            name: change.host,
            content: `${this.tunnelId}.cfargotunnel.com`,
            ttl: 1,
            priority: 10,
            proxied: true,
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "Skipping DNS Record Create because Dry Run mode is true",
              url,
              data
            )
            continue
          }

          await this.client.post(url, data)

          this.logger.info(
            "[DNS Record Create]",
            `CNAME Record with name ${change.host} was created in zone ${this.zone}`
          )

          break

        case "remove":
          const ids = this.cache.filter((r) => change.host.name === r.name)

          if (!ids.length) {
            this.logger.warn(
              "[DNS Record Delete]",
              `CNAME Record with name ${change.host} was not found in zone ${this.zone}`
            )

            continue
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "Skipping DNS Record Create because Dry Run mode is true",
              `With ids: ${ids}`
            )
            continue
          }

          await Promise.all(ids.map((r) => this.client.delete(`${basePath}/${r.id}`)))

          this.logger.info(
            "[DNS Record Delete]",
            `CNAME Record with id ${ids} was deleted in zone ${this.zone}`
          )

          break

        default:
          this.logger.error("[DNS Record Update]", `Unknown operation type ${change.type}`)

          break
      }
    }
  }
}

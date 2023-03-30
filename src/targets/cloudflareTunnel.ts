import type { APIResponseBody, DNSRecord } from "@cloudflare/types"
import { Axios } from "axios"
import jwt from "jwt-decode"
import { env, getCloudflareTunnelEnv } from "../env"
import { cloudflareEndpoints } from "../lib/cloudflareHelpers"
import { Logger } from "../lib/logger"
import {
  CloudflareTunnelConfiguration,
  cloudflareTunnelConfigurationSchema,
} from "../lib/zodSchemas"
import { CloudflareHost, HostChange, Target } from "../types"
import { getAxiosInstance } from "../utils"

type TunnelJWT = {
  a: string
  t: string
  s: string
}

// In Setup, get dns records and tunnel configuration, source of truth is tunnel configuration
//

export class CloudflareTunnel implements Target<CloudflareHost> {
  private client: Axios
  private zone: string
  private accountId: string
  private tunnelId: string
  private cachedDnsRecords: DNSRecord[]
  private logger: Logger
  private cachedConfiguration: CloudflareTunnelConfiguration | undefined
  private targetReverseProxy: string

  constructor(logger: Logger) {
    const cfDnsEnv = getCloudflareTunnelEnv()
    const decodedToken = jwt<TunnelJWT>(cfDnsEnv.CLOUDFLARE_TUNNEL_JWT)

    this.tunnelId = decodedToken.t
    this.accountId = decodedToken.a
    this.zone = cfDnsEnv.CLOUDFLARE_TUNNEL_ZONE_ID
    this.targetReverseProxy = cfDnsEnv.CLOUDFLARE_TUNNEL_TARGET_SERVICE

    this.cachedDnsRecords = []
    this.logger = logger.getSubLogger({ name: "CloudflareTunnel" })

    this.client = getAxiosInstance(logger, {
      method: "get",
      baseURL: "https://api.cloudflare.com/client/v4",
      headers: {
        Authorization: `Bearer ${cfDnsEnv.CLOUDFLARE_TUNNEL_API_TOKEN}`,
        "Content-type": "application/json",
      },
      data: {},
    })
  }

  getName(): string {
    return "cloudflare-tunnel"
  }

  async setup(): Promise<void> {
    // check token
    await this.client
      .get<APIResponseBody<{ status: string }>>("user/tokens/verify")
      .then((r) => {
        if (!r.data.success || r.data.result.status !== "active") {
          throw new Error("Error verifying tunnel: " + JSON.stringify(r.data))
        }

        return r.data
      })
      .catch((e: any) => {
        this.logger.silly("[Token Verify Raw Error]", e)

        throw new Error("Error verifying token")
      })

    // check tunnel
    await this.client
      .get(`accounts/${this.accountId}/cfd_tunnel/${this.tunnelId}`)
      .catch((e: any) => {
        this.logger.silly("[Tunnel Verify Raw Error]", e)

        throw new Error("Error verifying tunnel")
      })

    // Set initial host and configuration cache
    await this.getHosts()

    this.logger.info("Connection verified")
  }

  private async getDnsRecords(): Promise<DNSRecord[]> {
    const response = await this.client.get<APIResponseBody<DNSRecord[]>>(
      `zones/${this.zone}/dns_records?type=CNAME&per_page=100`
    )

    // TODO: I'm avoiding pagination here
    const records = response.data.result || []

    this.logger.debug(
      "[Fetch DNS Records]",
      "Dns Records fetched from cloudflare:",
      records.map((r) => r.name).join(", ")
    )

    return records
  }

  private async getTunnelConfiguration(): Promise<CloudflareTunnelConfiguration> {
    const response = await this.client.get<APIResponseBody>(
      `accounts/${this.accountId}/cfd_tunnel/${this.tunnelId}/configurations`
    )

    const configuration = cloudflareTunnelConfigurationSchema.safeParse(response.data.result)

    if (!configuration.success) {
      this.logger.error("[Get tunnel configuration error]", configuration.error.flatten())

      throw new Error("Error parsing tunnel configuration")
    }

    this.logger.debug(
      "[Get tunnel configuration]",
      "Tunnel configuration from cloudflare:",
      configuration
    )

    return configuration.data
  }

  async getHosts(): Promise<CloudflareHost[]> {
    const [dnsRecords, configuration] = await Promise.all([
      this.getDnsRecords(),
      this.getTunnelConfiguration(),
    ])

    // Reseting cache
    this.cachedDnsRecords = dnsRecords
    this.cachedConfiguration = configuration

    return configuration.config.ingress.map(({ service, hostname }) => {
      if (!hostname) {
        throw new Error("handle this")
      }

      // TODO: check if this is the best way to do this
      const externalHost = dnsRecords.find((h) => h.name === hostname)

      return {
        name: hostname,
        id: service,
        meta: {
          dnsRecordId: externalHost?.id,
          accountId: this.accountId,
          tunnelId: this.tunnelId,
          zoneId: this.zone,
        },
      }
    })
  }

  async apply(operations: HostChange<CloudflareHost>[]): Promise<void> {
    const [updateTunnelConfigurationMethod, updateTunnelConfigurationUrl] =
      cloudflareEndpoints.updateTunnelConfigurationForTunnelId(this.accountId, this.tunnelId)

    const [updateDnsRecordMethod, updateDnsRecordUrl] = cloudflareEndpoints.updateDnsRecordForZone(
      this.zone
    )

    if (!this.cachedConfiguration) {
      throw new Error("Cached configuration is undefined. Did you forget to call setup?")
    }

    for (const change of operations) {
      const dnsRecordId = change.host.meta.dnsRecordId

      switch (change.type) {
        case "add":
          const newTunnelConfiguration = {
            ...this.cachedConfiguration,
            config: {
              ...this.cachedConfiguration!.config,
              ingress: [
                ...this.cachedConfiguration!.config.ingress,
                {
                  service: this.targetReverseProxy, //change.host.id?,
                  hostname: change.host.name,
                },
              ],
            },
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[Tunnel Configuration Update]",
              "Skipping Tunnel Configuration Update because Dry Run mode is true",
              updateTunnelConfigurationUrl,
              newTunnelConfiguration
            )
            continue
          } else {
            await this.client.request({
              method: updateTunnelConfigurationMethod,
              url: updateTunnelConfigurationUrl,
              data: newTunnelConfiguration,
            })

            this.logger.info(
              "[Tunnel Configuration Update]",
              `Tunnel configuration was updated to route ${change.host.name} to ${this.targetReverseProxy}`
            )
          }

          if (dnsRecordId) {
            this.logger.info(
              "[DNS Record Create]",
              `CNAME Record with name ${change.host.name} already exists in zone ${this.zone}`
            )
            continue
          }

          const dnsRecordCreateData = {
            type: "CNAME",
            name: change.host.name,
            content: `${this.tunnelId}.cfargotunnel.com`,
            ttl: 1,
            priority: 10,
            proxied: true,
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "Skipping DNS Record Create because Dry Run mode is true",
              updateDnsRecordMethod,
              dnsRecordCreateData
            )
            continue
          } else {
            await this.client.request({
              method: updateDnsRecordMethod,
              url: updateDnsRecordUrl,
              data: dnsRecordCreateData,
            })

            this.logger.info(
              "[DNS Record Create]",
              `CNAME Record with name ${change.host.name} was created in zone ${this.zone}`
            )
          }
          break

        case "remove":
          const newConfiguration = {
            ...this.cachedConfiguration,
            config: {
              ...this.cachedConfiguration!.config,
              ingress: this.cachedConfiguration!.config.ingress.filter(
                (i) => i.service !== change.host.id
              ),
            },
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[Tunnel Configuration Update]",
              "Skipping Tunnel Configuration Update because Dry Run mode is true",
              newConfiguration
            )
            continue
          } else {
            await this.client.request({
              method: updateTunnelConfigurationMethod,
              url: updateTunnelConfigurationUrl,
              data: newConfiguration,
            })

            this.logger.info(
              "[Tunnel Configuration Update]",
              `Tunnel configuration was updated to remove host ${change.host.name}`
            )
          }

          if (!dnsRecordId) {
            this.logger.info(
              "[DNS Record Delete]",
              `CNAME Record with name ${change.host.name} was not found in zone ${this.zone}`
            )
            continue
          }

          const [deleteDnsMethod, deleteDnsUrl] = cloudflareEndpoints.deleteDnsRecordForZone(
            this.zone,
            dnsRecordId
          )

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Delete]",
              "Skipping DNS Record Delete because Dry Run mode is true",
              deleteDnsUrl
            )
            continue
          } else {
            await this.client.request({
              method: deleteDnsMethod,
              url: deleteDnsUrl,
            })

            this.logger.info(
              "[DNS Record Delete]",
              `CNAME Record with name ${change.host.name} was deleted in zone ${this.zone}`
            )
          }
          break

        default:
          this.logger.error("[DNS Record Update]", `Unknown operation type ${change.type}`)

          break
      }
    }
  }
}
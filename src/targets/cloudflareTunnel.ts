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
import { CloudflareMeta, Host, HostChange, Target } from "../types"
import { getAxiosInstance } from "../utils"

type TunnelJWT = {
  a: string
  t: string
  s: string
}

export class CloudflareTunnel implements Target<CloudflareMeta> {
  private client: Axios
  private logger: Logger
  private cachedConfiguration: CloudflareTunnelConfiguration | undefined

  private constants = new Map<string, string>()

  constructor(logger: Logger) {
    this.logger = logger.getSubLogger({ name: "CloudflareTunnel" })
    const cfDnsEnv = getCloudflareTunnelEnv()

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

  private getConstant(key: string): string {
    const value = this.constants.get(key)
    if (!value) {
      throw new Error(`Constant ${key} not set. Did you forget to call setup()?`)
    }

    return value
  }

  async setup(): Promise<void> {
    const cfDnsEnv = getCloudflareTunnelEnv()
    let decodedToken: TunnelJWT

    try {
      decodedToken = jwt<TunnelJWT>(cfDnsEnv.CLOUDFLARE_TUNNEL_JWT, { header: true })
    } catch (e) {
      throw new Error(`Error decoding JWT: ${e instanceof Error ? e.message : e} `)
    }

    this.constants.set("tunnelId", decodedToken.t)
    this.constants.set("accountId", decodedToken.a)
    this.constants.set("zoneId", cfDnsEnv.CLOUDFLARE_TUNNEL_ZONE_ID)
    this.constants.set("targetReverseProxy", cfDnsEnv.CLOUDFLARE_TUNNEL_TARGET_SERVICE)

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
      .get(`accounts/${this.getConstant("accountId")}/cfd_tunnel/${this.getConstant("tunnelId")}`)
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
      `zones/${this.getConstant("zoneId")}/dns_records?type=CNAME&per_page=100`
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
    const [_, getTunnelConfigurationUrl] = cloudflareEndpoints.getTunnelConfigurationForTunnelId(
      this.getConstant("accountId"),
      this.getConstant("tunnelId")
    )

    const response = await this.client.get<APIResponseBody>(getTunnelConfigurationUrl)

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

  async getHosts(): Promise<Host<CloudflareMeta>[]> {
    const [dnsRecords, configuration] = await Promise.all([
      this.getDnsRecords(),
      this.getTunnelConfiguration(),
    ])

    // Reseting cache
    this.cachedConfiguration = configuration

    return configuration.config.ingress
      .filter(({ hostname }) => hostname)
      .map(({ service, hostname }) => {
        // TODO: check if this is the best way to do this
        const externalHost = dnsRecords.find((h) => h.name === hostname)

        return {
          name: hostname!,
          id: service,
          meta: {
            dnsRecordId: externalHost?.id,
          },
        }
      })
  }

  async apply(operations: HostChange<unknown, CloudflareMeta>[]): Promise<void> {
    const zone = this.getConstant("zoneId")
    const tunnel = this.getConstant("tunnelId")
    const targetReverseProxy = this.getConstant("targetReverseProxy")

    const [updateTunnelConfigurationMethod, updateTunnelConfigurationUrl] =
      cloudflareEndpoints.updateTunnelConfigurationForTunnelId(
        this.getConstant("accountId"),
        this.getConstant("tunnelId")
      )

    const [updateDnsRecordMethod, updateDnsRecordUrl] =
      cloudflareEndpoints.updateDnsRecordForZone(zone)

    if (!this.cachedConfiguration) {
      throw new Error("Cached configuration is undefined. Did you forget to call setup?")
    }

    for (const change of operations) {
      const dnsRecordId = change.targetMeta?.dnsRecordId

      switch (change.type) {
        case "add":
          const newTunnelConfiguration = {
            ...this.cachedConfiguration,
            config: {
              ...this.cachedConfiguration!.config,
              ingress: [
                ...this.cachedConfiguration!.config.ingress,
                {
                  service: targetReverseProxy, // TODO: change.host.id?,
                  hostname: change.host.name,
                },
              ],
            },
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[Tunnel Configuration Update]",
              "DRY_RUN",
              `Tunnel configuration would be updated to route ${change.host.name} to ${targetReverseProxy}`
            )
            this.logger.debug("[Tunnel Configuration Update]", newTunnelConfiguration)
            continue
          } else {
            await this.client.request({
              method: updateTunnelConfigurationMethod,
              url: updateTunnelConfigurationUrl,
              data: newTunnelConfiguration,
            })

            this.logger.info(
              "[Tunnel Configuration Update]",
              `Tunnel configuration was updated to route ${change.host.name} to ${targetReverseProxy}`
            )
          }

          if (dnsRecordId) {
            this.logger.info(
              "[DNS Record Create]",
              `CNAME Record with name ${change.host.name} already exists in zone ${zone}`
            )
            continue
          }

          const dnsRecordCreateData = {
            type: "CNAME",
            name: change.host.name,
            content: `${tunnel}.cfargotunnel.com`,
            ttl: 1,
            priority: 10,
            proxied: true,
          }

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Create]",
              "DRY_RUN",
              `CNAME Record with name ${change.host.name} would be created in zone ${zone}`
            )
            this.logger.debug("[DNS Record Create]", dnsRecordCreateData)
            continue
          } else {
            await this.client.request({
              method: updateDnsRecordMethod,
              url: updateDnsRecordUrl,
              data: dnsRecordCreateData,
            })

            this.logger.info(
              "[DNS Record Create]",
              `CNAME Record with name ${change.host.name} was created in zone ${zone}`
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
              "DRY_RUN",
              `Tunnel configuration would be updated to remove ${change.host.name}`
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
              `CNAME Record with name ${change.host.name} was not found in zone ${zone}`
            )
            continue
          }

          const [deleteDnsMethod, deleteDnsUrl] = cloudflareEndpoints.deleteDnsRecordForZone(
            zone,
            dnsRecordId
          )

          if (env.DRY_RUN) {
            this.logger.info(
              "[DNS Record Delete]",
              "DRY_RUN",
              `CNAME Record with name ${change.host.name} and id ${dnsRecordId} would be deleted in zone ${zone}`
            )
            continue
          } else {
            await this.client.request({
              method: deleteDnsMethod,
              url: deleteDnsUrl,
            })

            this.logger.info(
              "[DNS Record Delete]",
              `CNAME Record with name ${change.host.name} was deleted in zone ${zone}`
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

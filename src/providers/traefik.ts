import { Axios } from "axios"
import { getTraefikEnv } from "../env"
import { Logger } from "../lib/logger"
import { Scheduler } from "../scheduler"
import { Host, HostChange, Provider } from "../types" // TODO: types
import { getAxiosInstance } from "../utils"

interface Router {
  entryPoints: string[]
  service: string
  rule: string
  priority: number
  status: string
  using: string[]
  name: string
  provider: string
  middlewares: string[]
  tls: {
    certResolver: string
  }
}

interface TraefikService {
  id: string
  names: string[]
}

export class TraefikProvider implements Provider {
  private client: Axios
  private previousHostCache: Host[] = []
  private pollInterval: number

  constructor(private logger: Logger, private scheduler: Scheduler) {
    const traefikEnv = getTraefikEnv()

    this.client = getAxiosInstance(logger, {
      baseURL: traefikEnv.TRAEFIK_API_URL,
    })

    this.pollInterval = traefikEnv.TRAEFIK_POLL_INTERVAL
  }

  getName(): string {
    return "traefik"
  }

  async setup(): Promise<void> {
    const traefikEnv = getTraefikEnv()
    this.logger.info(`Traefik Api Url=${traefikEnv.TRAEFIK_API_URL}`)
    this.logger.info(`Traefik Poll Interval=${traefikEnv.TRAEFIK_POLL_INTERVAL}`)

    await this.client.get("version").catch((e: any) => {
      this.logger.silly("[Traefik Test Connection Raw Error]", e.response)

      this.logger.fatal("[Traefik Test Connection]", "Error verifying connection", {
        data: e.response.data,
      })

      throw new Error("Error verifying traefik connection")
    })

    // Initialize cache
    this.previousHostCache = await this.getHosts()

    this.logger.info("[Traefik Test Connection]", "Connection verified")
  }

  subscribe(cb: (changes: HostChange[]) => void): void {
    this.logger.info(
      "[Traefik]",
      `Traefik doesn't support live events so we're polling every ${this.pollInterval} seconds`
    )

    this.scheduler.scheduleIntervalJob({
      type: "TraefikEvents",
      jobId: "Traefik Events",
      fn: async () => {
        this.logger.debug("[Traefik Events]", "Polling...")

        const newHosts = await this.getHosts()

        const toAdd = newHosts.filter((h) => !this.previousHostCache.find((pv) => pv.id === h.id))
        const toDelete = this.previousHostCache.filter(
          (h) => !newHosts.find((pv) => pv.id === h.id)
        )

        this.previousHostCache = newHosts

        const changes = [
          ...toAdd.map((h) => ({ host: h, type: "add" as const })),
          ...toDelete.map((h) => ({ host: h, type: "remove" as const })),
        ] satisfies HostChange[]

        if (changes.length > 0) {
          this.logger.info(
            "[Traefik Events]",
            `${changes.length} change(s) found: ${changes
              .map((c) => `${c.type} ${c.host}`)
              .join(", ")}`
          )

          cb(changes)
        }
      },
      intervalTimeInSeconds: this.pollInterval,
    })
  }

  // TODO: change with a serializable query, maybe with mongo query syntax
  // https://jsonlogic.com, https://github.com/justinfagnani/jexpr
  getHosts = async (): Promise<Host[]> => {
    const { data: routers } = await this.client.get<Router[]>("http/routers")

    this.logger.silly("[Fetch Router Raw]", routers)

    const extractService = (router: Router): TraefikService => {
      const hostRegex = /Host\(([^\)]*)\)/

      const [_, hosts] = hostRegex.exec(router.rule) || ["", ""]

      const names = hosts
        .replace(/\`/g, "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)

      return { id: router.service, names }
    }

    const explodeHosts = (services: TraefikService[]) =>
      services.reduce<Host[]>((acc, s) => {
        const hosts = s.names.map((n) => ({ id: s.id, name: n }))
        return [...acc, ...hosts]
      }, [])

    const hosts = routers
      .filter((r) => r.status === "enabled" && r.rule && r.provider !== "internal")
      .map((r) => extractService(r))
      .filter((s) => s.names.length > 0)
      .map((s) => explodeHosts([s]))
      .flat()
      .reduce<Host[]>((acc, h) => {
        if (!acc.find((a) => a.name === h.name)) {
          this.logger.debug("[Get Traefik Hosts]", `Duplicate host ${h.name} found, skipping...`)
          acc.push(h)
        }

        return acc
      }, [])

    this.logger.debug("[Get Traefik Hosts]", hosts.map((h) => h.name).join(", "))

    return hosts
  }
}

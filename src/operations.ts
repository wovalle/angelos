import { getRedundantJobs } from "./lib/getRedundantJobs"
import { Logger } from "./lib/logger"
import { Scheduler } from "./scheduler"
import { Host, HostChange, Provider, Target } from "./types"

type OperationParams = {
  logger: Logger
  scheduler: Scheduler
  providers: Provider[]
  targets: Target[]
  addTargetRecordDelay: number
  removeTargetRecordDelay: number
}

export const makeOperations = (opts: OperationParams) => {
  const diff = (providerHosts: Host[], targetHosts: Host[]): HostChange<any, any>[] => {
    const recordsInProviderButNotInTarget = providerHosts
      .filter((h) => !targetHosts.find((t) => h.name === t.name))
      .map(
        (host) =>
          ({
            type: "add",
            host,
            providerMeta: host.meta,
            targetMeta: undefined,
          } satisfies HostChange)
      )

    logger.debug("[recordsInProviderButNotInTarget]", recordsInProviderButNotInTarget)

    const recordsInTargetButNotInProvider = targetHosts
      .filter((h) => !providerHosts.find((t) => t.name === h.name))
      .map(
        (h) =>
          ({
            type: "remove",
            host: h,
            providerMeta: undefined,
            targetMeta: h.meta,
          } satisfies HostChange)
      )

    logger.debug("[recordsInTargetButNotInProvider]", recordsInTargetButNotInProvider)

    return [...recordsInProviderButNotInTarget, ...recordsInTargetButNotInProvider]
  }

  const { providers, targets, logger, scheduler } = opts
  /**
   * TODO: need to rethink this.
   *
   * As of now if I have provider1 with hosts a,b and
   * provider2 with hosts c,d, technically I'd expect
   * target1 and target2 to have hosts a,b,c,d.
   *
   * However, how I coded this up, it's not the case.
   * It'd check provider 1 first, the diff would show that
   * we need a remove operation for c,d and then go to
   * provider 2 and diff would show that we need an remove
   * operation for a,b.
   *
   * I somehow need to know which subset of target hosts
   * belong to which provider If I want multi provider
   * to work correctly. TXT records maybe?
   *
   */
  const syncResources = async () => {
    const hostsInTarget = new Map<Target, Host[]>()

    for (const t of targets) {
      const hosts = await t.getHosts()

      hostsInTarget.set(t, hosts)
    }

    for (const provider of providers) {
      const providerHosts = await provider.getHosts()

      for (const [target, targetHosts] of hostsInTarget) {
        const changesForProvider = diff(providerHosts, targetHosts)

        if (!changesForProvider.length) {
          logger.debug(
            `No changes for provider ${provider.getName()} and target ${target.getName()}`
          )
          continue
        }

        const currentJobs = Array.from(scheduler.getJobs().values())
        const redundantJobOperations = getRedundantJobs(currentJobs, changesForProvider)

        let changes = changesForProvider
        if (redundantJobOperations.length) {
          logger.info(`About to remove ${redundantJobOperations.length} redundant job operations`)

          redundantJobOperations.forEach(([redundantJob, redundantChange]) => {
            logger.info(
              ` - removing redundant job: ${redundantJob.jobId} and skipping change: ${redundantChange.type} ${redundantChange.host.name}`
            )
            scheduler.removeJobIfExists(redundantJob)
            changes = changes.filter(
              (c) => !(c.type === redundantChange.type && c.host.name === redundantChange.host.name)
            )
          })
        }

        logger.info(`About to schedule ${changes.length} changes to ${target.getName()}:`)

        changes.forEach((c) => logger.info(` - ${c.type} ${c.host.name}`))

        for (const c of changes) {
          const delayInSeconds =
            c.type === "add" ? opts.addTargetRecordDelay : opts.removeTargetRecordDelay

          scheduler.scheduleJob({
            jobId: `${new Date().toISOString()}::${target.getName()}::${c.type}::${c.host.name}`,
            type: "ApplyChanges",
            delayInSeconds,
            fn: async () => {
              await target.apply([c])
            },
            meta: {
              hostName: c.host.name,
              type: c.type,
            },
          })
        }
      }
    }
  }

  return {
    syncResources,
  }
}
